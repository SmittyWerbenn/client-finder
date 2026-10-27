# Prompt Setup Server — ClientFinder

Salin blok **PROMPT** di bawah ini ke agent/CLI yang berjalan di VPS (Claude Code,
Codex, atau sesi SSH berbantuan AI). Isi dulu semua placeholder `<...>`; jangan
kirim nilai secret ke tempat lain.

---

## PROMPT

Kamu adalah site reliability engineer yang men-deploy aplikasi production ke VPS
Ubuntu. Tugasmu: memasang **ClientFinder** (Next.js 16 + PostgreSQL 16, Docker
Compose) sampai bisa diakses lewat HTTPS, lalu menyerahkan laporan verifikasi.
Kerjakan sendiri langkah di bawah, jangan hanya menjelaskan.

### Input

```
DOMAIN=<domain-atau-subdomain>
SERVER_IP=<ip-publik-vps>
TLS_EMAIL=<email-untuk-let's-encrypt>
REPO=https://github.com/SmittyWerbenn/client-finder.git
BRANCH=main
APP_DIR=/opt/clientfinder
GOOGLE_PLACES_API_KEY=<api-key-google-places>
SUPERADMIN_NAME=Superadmin
SUPERADMIN_EMAIL=<email-superadmin>
SUPERADMIN_PASSWORD=<password-min-10-karakter-ideal-20+>
```

Jika ada nilai yang masih `<...>`, **berhenti dan tanyakan** nilai itu. Jangan
menebak domain, IP, atau kredensial.

### Aturan wajib

1. **Jangan pernah mencetak, menyalin ke commit, atau mengirim balik nilai
   secret** (password, API key, `NEXTAUTH_SECRET`). Saat menampilkan log, sensor
   nilainya. File `.env` wajib `chmod 600` dan tidak boleh masuk git.
2. **Jangan mengubah kode aplikasi.** Jika menemukan bug yang menghalangi deploy,
   laporkan file + error aslinya dan tunggu keputusan.
3. **Jangan menghentikan service lain** yang sudah memakai port 80/443. Deteksi
   dulu; integrasikan reverse proxy yang ada atau pakai subdomain staging.
4. **Jangan mengekspos port 3000 atau 5432 ke publik.** App hanya listen di
   `127.0.0.1:3000`; database hanya di network Docker internal.
5. Setiap langkah harus diverifikasi dengan output nyata. Jangan mengklaim
   "berhasil" tanpa perintah verifikasi yang lulus.
6. Semua perintah harus aman diulang (idempotent) dan memakai `set -euo pipefail`
   untuk skrip.
7. Bahasa laporan akhir: Indonesia.

### Konteks aplikasi

- Next.js App Router (Node runtime, bukan static export), React 19, TypeScript.
- Database PostgreSQL 16; migrasi SQL di `drizzle/postgres/` dijalankan otomatis
  oleh entrypoint container (`node scripts/migrate.mjs && npm start`), idempotent.
- `docker-compose.yml` menjalankan dua service: `db` (postgres:16-alpine, volume
  `pgdata`) dan `app` (build lokal, port `127.0.0.1:3000`).
- Health check publik: `GET /api/health` → `{"status":"ok","database":"postgres"}`.
- Login: `/login`. Dashboard: `/dashboard` (butuh sesi cookie httpOnly).
- Superadmin pertama dibuat dari `SEED_SUPERADMIN_*` saat database kosong.

### Langkah 0 — Preflight (jangan ubah apa pun)

```bash
set -euo pipefail
uname -a
cat /etc/os-release | head -4
nproc; free -h; df -h /
ip -4 addr show scope global
ss -tlnp | grep -E ':(22|80|443|3000|5432)\b' || true
docker --version || true
docker compose version || true
dig +short "$DOMAIN" A
```

Syarat minimum: Ubuntu 22.04/24.04, 2 vCPU, 2 GB RAM (tambahkan 2 GB swap bila
RAM 2 GB), 20 GB disk kosong, akses sudo. Pastikan `dig` mengembalikan
`SERVER_IP`. Jika domain masih mengarah ke GitHub Pages atau proxy Cloudflare,
**jangan ubah DNS dulu** tanpa konfirmasi — situs lama masih dipakai.

### Langkah 1 — Docker Engine + Compose plugin

Jika `docker compose version` belum ada:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
```

Jalankan compose dengan `sudo` atau tambahkan user deploy ke grup `docker`
(catat: grup docker setara root).

### Langkah 2 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

Port 3000 dan 5432 **tidak** dibuka.

### Langkah 3 — Ambil kode

```bash
sudo install -d -o "$USER" -g "$USER" /opt/clientfinder
git clone --branch main https://github.com/SmittyWerbenn/client-finder.git /opt/clientfinder
cd /opt/clientfinder
git log -1 --oneline
```

Jika repo private dan clone gagal, minta user memasang deploy key; jangan menaruh
token di URL remote.

### Langkah 4 — Buat `.env`

Gunakan password hex agar aman di URL koneksi. Matikan history untuk sesi ini.

```bash
cd /opt/clientfinder
set +o history
umask 077
POSTGRES_PASSWORD="$(openssl rand -hex 24)"     # 48 karakter hex
NEXTAUTH_SECRET="$(openssl rand -base64 48)"
cat > .env <<EOF
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=https://${DOMAIN}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}
SEED_SUPERADMIN_NAME=${SUPERADMIN_NAME}
SEED_SUPERADMIN_EMAIL=${SUPERADMIN_EMAIL}
SEED_SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}
API_HIT_MONTHLY_LIMIT=5000
USER_MONTHLY_HIT_LIMIT=500
NEXT_PUBLIC_CATALOG_URL=https://${DOMAIN}
SESSION_TTL_HOURS=12
EOF
chmod 600 .env
git status --short   # .env harus tidak muncul (sudah di .gitignore)
```

Catatan: **jangan menambahkan `DATABASE_URL` di `.env` Compose** — compose sudah
menginjeksi `postgres://clientfinder:${POSTGRES_PASSWORD}@db:5432/clientfinder`.
Jangan mengganti `POSTGRES_PASSWORD` setelah database dibuat; volume `pgdata`
menyimpan password lama.

Google Places: key harus berasal dari project dengan **Places API (New)** aktif
dan billing aktif. Batasi key ke API tersebut (dan IP server bila memungkinkan).
Jika key kosong, pencarian mengembalikan 503.

### Langkah 5 — Build dan jalankan

```bash
cd /opt/clientfinder
sudo docker compose config -q
sudo docker compose up -d --build
sudo docker compose ps
```

Tunggu hingga `app` sehat (healthcheck Docker punya start period 20 detik):

```bash
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health; then echo; break; fi
  sleep 3
done
sudo docker compose logs --tail=80 app
```

Yang harus terlihat di log: migrasi `applied ...` (atau tidak ada baris bila sudah
pernah), lalu `Ready`/`started server`. Jangan lanjut bila container restart-loop.

### Langkah 6 — HTTPS dengan Caddy

Jika port 80/443 **masih kosong**, pasang Caddy:

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update && sudo apt-get install -y caddy
```

Tulis `/etc/caddy/Caddyfile` (ganti `DOMAIN` dengan nilai sebenarnya):

```
DOMAIN {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000 {
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    log {
        output file /var/log/caddy/clientfinder.log
    }
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Jika 80/443 sudah dipakai Nginx/Apache: **jangan install Caddy**. Tambahkan
server block/proxy ke reverse proxy yang ada, lalu terbitkan sertifikat dengan
certbot. Jangan mematikan situs lain.

Cloudflare: jika proxy aktif dan penerbitan sertifikat gagal, set record ke
**DNS only** sementara sampai sertifikat terbit; setelah itu proxy boleh
diaktifkan dengan SSL/TLS mode **Full (strict)**.

### Langkah 7 — Verifikasi end-to-end

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://DOMAIN/login          # 200
curl -sS https://DOMAIN/api/health                                       # {"status":"ok","database":"postgres"}
curl -sS -o /dev/null -w '%{http_code}\n' https://DOMAIN/dashboard       # 307/302 ke /login
curl -sS -o /dev/null -w '%{http_code}\n' https://DOMAIN/api/admin/usage # 401
```

Uji login Superadmin **tanpa mencetak token**:

```bash
umask 077
JAR=$(mktemp)
curl -sS -c "$JAR" -H 'Content-Type: application/json' \
  --data "$(jq -n --arg e "$SUPERADMIN_EMAIL" --arg p "$SUPERADMIN_PASSWORD" '{email:$e,password:$p}')" \
  https://DOMAIN/api/auth/login | jq '{ok, role: .data.user.role}'
curl -sS -b "$JAR" https://DOMAIN/api/auth/me | jq '{ok, email: .data.user.email, role: .data.user.role}'
curl -sS -b "$JAR" -o /dev/null -w '%{http_code}\n' https://DOMAIN/api/admin/usage   # 200
curl -sS -b "$JAR" -X POST https://DOMAIN/api/auth/logout | jq '.ok'
curl -sS -b "$JAR" -o /dev/null -w '%{http_code}\n' https://DOMAIN/api/auth/me       # 401
rm -f "$JAR"
```

Uji persistensi:

```bash
sudo docker compose restart app
sleep 8
curl -sS http://127.0.0.1:3000/api/health
sudo docker compose exec -T db psql -U clientfinder -d clientfinder -c 'select count(*) from users;'
```

Uji satu pencarian kecil dari UI (ini memakai kuota Google berbayar — lakukan
hanya setelah user menyetujui), lalu pastikan hit muncul di `/dashboard/api-usage`.
Jangan melakukan pencarian berulang saat verifikasi.

### Langkah 8 — Operasional

- Log: `sudo docker compose logs -f --tail=100 app` (jangan biarkan log tumbuh
  tanpa batas; set rotasi Docker bila perlu).
- Update: `git pull --ff-only` → `docker compose up -d --build` → cek health.
  Migrasi berjalan otomatis dan idempotent.
- Rollback: checkout commit sebelumnya lalu build ulang. Migrasi bersifat maju;
  jika schema berubah dan rollback tidak kompatibel, hentikan dan minta keputusan
  sebelum melanjutkan.
- Jangan mengubah password Superadmin di UI selama `SEED_SUPERADMIN_*` masih
  terisi: saat restart, seed akan menyamakan password dengan nilai env. Setelah
  yakin, kosongkan **kedua** variabel seed lalu `docker compose up -d`.
- Pantau `df -h`, `docker stats`, dan `/api/health` dari uptime monitor.

### Laporan akhir (wajib)

Serahkan ringkas berisi:

1. URL HTTPS dan status health (tempel output asli).
2. OS, versi Docker/Compose, versi PostgreSQL, dan digest image app.
3. Status container, port yang listen, status UFW (22/80/443 saja).
4. Penerbit + tanggal kedaluwarsa sertifikat TLS.
5. Daftar key yang ada di `.env` **tanpa nilainya**.
6. Email Superadmin (bukan password) dan langkah manual yang tersisa (DNS,
   Google billing, rotasi key).
7. Jika ada langkah gagal: perintah, error asli, dan rekomendasi — jangan
   menyembunyikan kegagalan.

---

## Catatan untuk pemilik aplikasi

- **Jangan** menjalankan `docker compose down -v`; flag `-v` menghapus volume
  database.
- Ganti `POSTGRES_PASSWORD` hanya dengan prosedur `ALTER ROLE` + update `.env`,
  bukan sekadar edit `.env`.
- Domain `client-finder.frel.cloud` saat ini masih mengarah ke deployment GitHub
  Pages lama. Pindahkan A record ke IP VPS hanya setelah stack baru terverifikasi;
  gunakan subdomain staging lebih dulu bila ingin aman.
- Google Places API berbayar: batasi kuota bulanan di Google Cloud Console dan
  pantau halaman **API Usage** di aplikasi.
