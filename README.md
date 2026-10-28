# ClientFinder

Platform **B2B prospecting & partnership engine** untuk menemukan calon klien dan
partner bisnis lokal melalui Google Places API, mengelola pipeline lead, melakukan
outreach WhatsApp multi-tujuan, dan mengaudit setiap pemakaian API — dengan RBAC
tiga level (Superadmin, Admin, User) dan dukungan database **SQLite maupun PostgreSQL**.

Filter status website bersifat **opsional**: semua bisnis (partnership/suplai),
khusus tanpa website (jasa web/digitalisasi), atau khusus yang sudah punya website.

Dokumen arsitektur lengkap (diagram alur, matriks RBAC, skema, deployment):
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Fitur

- **Pencarian prospek** dari Google Places Text Search (`"<keyword> di <kota>"`),
  pagination 20/halaman, plafon 100 prospek per pencarian.
- **Filter status website opsional** (`all` / `no_website` / `has_website`) +
  Place Details terbatas untuk melengkapi nomor telepon.
- **Pitch angle adaptif**: bisnis tanpa website mendapat angle digitalisasi,
  bisnis yang sudah online mendapat angle kemitraan/suplai.
- **Normalisasi nomor** ke format WhatsApp internasional (`62xxx`) dan dedupe
  `placeId`.
- **Pipeline lead** (New → Contacted → Interested → Closed) tersimpan di
  database, bukan localStorage.
- **Outreach**: kirim WA 1-klik, template pesan, broadcast massal dengan jeda
  3/5/10 detik, progress bar, pause/stop, auto status `Contacted`, export CSV.
- **RBAC**: menu & endpoint dinamis per role; kategori user-scoped.
- **API Usage Metrics**: total hit bulan berjalan, estimasi kuota, hit per user,
  audit log setiap panggilan Text Search / Place Details.
- **Security**: scrypt password, JWT httpOnly cookie, session revocation,
  rate-limit login, validasi Zod, error response seragam, security headers.

> Tidak ada lagi mode demo/mock, kredit simulasi, maupun static export GitHub
> Pages. Semua data berasal dari Google Places API dan database.

---

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16 App Router (Node runtime) + React 19 + TypeScript strict |
| Database | SQLite/libSQL (default) atau PostgreSQL 16 |
| ORM/Migrasi | Drizzle ORM + Drizzle Kit (dua dialek) |
| Auth | JWT HS256 (`jose`), cookie httpOnly, scrypt (`node:crypto`) |
| Validasi | Zod |
| Deployment | Node 22+ / Docker / Docker Compose |

---

## Mulai Cepat (SQLite)

```bash
cp .env.example .env
# isi minimal:
#   NEXTAUTH_SECRET=$(openssl rand -base64 48)
#   SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD
#   GOOGLE_PLACES_API_KEY
#   DATABASE_URL=file:data/clientfinder.db

npm install
npm run db:migrate      # opsional — server juga auto-migrate saat boot
npm run dev             # http://localhost:3000
```

Login memakai akun Superadmin dari env seed. Buat Admin/User dari
**Manajemen User**, lalu tugaskan kategori ke akun User dari **Kategori & Pitch**.

## Mulai Cepat (PostgreSQL)

```bash
# 1. Siapkan database
createdb clientfinder

# 2. Arahkan env
DATABASE_URL=postgres://user:password@localhost:5432/clientfinder \
  npm run db:migrate

# 3. Jalankan
DATABASE_URL=postgres://user:password@localhost:5432/clientfinder npm start

# opsional: generate ulang migrasi setelah schema berubah
npm run db:generate             # SQLite  → drizzle/sqlite/
npm run db:generate:pg          # Postgres → drizzle/postgres/
```

Atau pakai Docker Compose (Postgres + app):

```bash
cp .env.example .env     # isi NEXTAUTH_SECRET, GOOGLE key, seed, POSTGRES_PASSWORD
docker compose up -d --build
curl localhost:3000/api/health
```

---

## Environment Penting

| Variable | Wajib | Keterangan |
|---|:--:|---|
| `NEXTAUTH_SECRET` | ✅ | Kunci signing JWT (min. 32 karakter). |
| `NEXTAUTH_URL` | — | Origin kanonik (`https://client-finder.frel.cloud`). |
| `DATABASE_URL` | ✅ | `file:data/clientfinder.db` atau `postgres://…`. |
| `GOOGLE_PLACES_API_KEY` | ✅* | *Pencarian mengembalikan 503 bila kosong. |
| `SEED_SUPERADMIN_EMAIL` / `_PASSWORD` | ✅ awal | Membuat Superadmin pertama saat DB kosong. |
| `API_HIT_MONTHLY_LIMIT` | — | Plafon hit platform/bulan (default 5000). |
| `USER_MONTHLY_HIT_LIMIT` | — | Plafon hit role USER/bulan (default 500). |
| `DATABASE_SSL` | — | `true` untuk Postgres terkelola. |
| `SESSION_TTL_HOURS` | — | Masa sesi, default 12 jam. |
| `DOKU_CLIENT_ID` | ✅** | Client ID DOKU Checkout. Tanpa Client ID/Secret, tombol beli membalas 503 `DOKU_NOT_CONFIGURED`. |
| `DOKU_SECRET_KEY` | ✅** | Secret key DOKU (dipakai untuk signature non-SNAP). |
| `DOKU_IS_PRODUCTION` | — | `true` (default) mengarah ke `api.doku.com`. |
| `DOKU_CHECKOUT_URL_PROD` / `_SANDBOX` | — | Override endpoint checkout (base URL atau URL penuh). |
| `NEXT_PUBLIC_APP_URL` | — | Dipakai sebagai `callback_url` DOKU + tautan status. |
| `NEXT_PUBLIC_ADMIN_WHATSAPP` | — | Nomor admin untuk aksi sekunder "Butuh bantuan". |

Lihat `.env.example` untuk daftar lengkap.

---

## Struktur Singkat

```
app/
  api/                auth, search, leads, categories, admin, export, health
  page.tsx            public landing page (hero, fitur, kategori, pricing, FAQ)
  console/            console operasional + login
    (shell)/          layout RBAC + halaman search/leads/categories/users/api-usage
    login/            halaman login email+password
  landing.css         stylesheet landing page (prefix .lnd)
components/
  landing/            Navbar, Hero, Features, Niches, Pricing, CustomCallout, Faq, Footer
  AppShell, SearchWorkspace, ProspectTable, BroadcastModal,
                      LeadsManager, CategoriesPanel, UsersPanel, UsagePanel
lib/
  db/                 schema SQLite & Postgres, adapter, migrator, seed
  repositories/       aturan bisnis + ownership lead/kategori/user
  api-tracker.ts      atomic hit logger + metrik
  places.ts           pipeline Google Places
  demo-data.ts        fixture 18 leads untuk mode demo read-only
  demo-api.ts         mock API client saat cookie `cf_demo` aktif
  doku.ts             DOKU Checkout: signature, create payment, verifikasi webhook
  plans.ts            katalog paket berbayar (sumber tunggal harga)
  site.ts             identitas komersial + tautan WhatsApp admin
  auth.ts / session.ts / roles.ts
drizzle/
  sqlite/             migrasi SQLite
  postgres/           migrasi PostgreSQL
scripts/migrate.mjs   migrasi CLI untuk deploy/CI
tests/                fake Places server + E2E API/RBAC
```

---

## API

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/api/auth/login` | publik | Login email+password, set cookie. |
| POST | `/api/auth/logout` | auth | Cabut sesi (`session_version++`). |
| GET | `/api/auth/me` | auth | Profil + pemakaian API. |
| POST | `/api/search` | auth | Pencarian + filter + simpan lead. |
| GET | `/api/leads` | auth (scoped) | Daftar lead + hitungan status. |
| POST | `/api/leads` | Admin+ | Tambah lead manual. |
| PATCH | `/api/leads/:id` | owner/Admin | Status (owner) atau profil (Admin). |
| DELETE | `/api/leads/:id` | Admin+ | Hapus lead. |
| GET/POST | `/api/categories` | auth | Kategori scoped. |
| PUT/DELETE | `/api/categories/:id` | owner/SA | Ubah/hapus kategori. |
| POST | `/api/categories/reset` | Superadmin | Pulihkan katalog global. |
| GET/POST | `/api/admin/users` | Superadmin | Daftar/buat user. |
| PATCH/DELETE | `/api/admin/users/:id` | Superadmin | Ubah/hapus user. |
| POST | `/api/admin/users/:id/reset-password` | Superadmin | Reset password. |
| GET | `/api/admin/usage` | Admin+ | Metrik + audit log API. |
| POST | `/api/checkout` | publik | Buat order paket + sesi pembayaran DOKU. |
| POST | `/api/doku/notification` | publik (signature) | Webhook DOKU → update status order. |
| GET | `/api/orders/:invoiceNumber` | publik | Status order (field publik saja). |
| GET | `/api/admin/orders` | Admin+ | Daftar order + ringkasan revenue. |
| POST/GET | `/api/export` | auth (scoped) | CSV (≤1000 baris). |
| GET | `/api/health` | publik | Status server + database. |

Semua respons JSON memakai amplop konsisten:

```json
{ "ok": true, "data": { } }
{ "ok": false, "error": { "code": "FORBIDDEN", "message": "…" } }
```

Setiap panggilan Google Places (termasuk retry/gagal) dicatat atomik ke
`api_usage_logs` + `api_usage_counters` dengan `userId`, endpoint, query,
status, `httpStatus`, `placeId`, dan durasi.

---

## Pembayaran Online (DOKU Checkout)

Paket **Starter Pass** (Rp 199.000) dan **Agency Pro** (Rp 499.000) dibeli
langsung dari landing page. Tombol **Beli / Order** membuka dialog data
pelanggan lalu mengarahkan browser ke halaman pembayaran DOKU (Virtual
Account, QRIS, e-wallet, kartu kredit). WhatsApp hanya aksi sekunder
("Butuh bantuan / Tanya Admin") dan tetap kanal utama paket Enterprise.

### Alur

```
landing (#harga) → CheckoutDialog → POST /api/checkout
   → order PENDING di tabel orders (invoice CF…)
   → POST https://api.doku.com/checkout/v1/payment (signed)
   → redirect response.payment.url (checkout.doku.com)
   → pelanggan bayar → DOKU POST /api/doku/notification (signed)
   → order PAID → /checkout/status?invoice=… (polling 5 detik)
```

Halaman hasil memakai `order.callback_url` + `auto_redirect`, sehingga
pelanggan kembali ke `/checkout/status` setelah transaksi.

### Signature (non-SNAP)

```
Digest    = base64(sha256(body_mentah))
Component = "Client-Id:<id>\nRequest-Id:<uuid>\nRequest-Timestamp:<ISO8601Z>\n
             Request-Target:<path>\nDigest:<digest>"
Signature = "HMACSHA256=" + base64(hmac_sha256(secret_key, Component))
```

Dikirim sebagai header `Client-Id`, `Request-Id`, `Request-Timestamp`,
`Signature`. Untuk webhook, `Request-Target` = path URL notifikasi
(`/api/doku/notification`) dan digest dihitung dari body yang diterima —
verifikasi memakai perbandingan waktu-konstan.

### Konfigurasi di DOKU Back Office

1. Isi `DOKU_CLIENT_ID` + `DOKU_SECRET_KEY` pada `.env` (jangan di-commit).
2. Set **Notification URL** = `https://<domain>/api/doku/notification`.
   Request juga mengirim `additional_info.override_notification_url`.
3. Mode production: `DOKU_IS_PRODUCTION=true`.

Tanpa kredensial, `/api/checkout` membalas `503 DOKU_NOT_CONFIGURED`; order
tetap tersimpan sebagai PENDING dan dialog menawarkan penyelesaian manual
via WhatsApp beserta nomor invoice.

### Status order

`PENDING` → `PAID` (notifikasi `transaction.status = SUCCESS`).
`FAILED` dari DOKU **diabaikan** untuk Checkout (pelanggan masih bisa
memilih kanal lain). Notifikasi berulang bersifat idempotent — `paid_at`
tidak berubah dan status `PAID` tidak pernah turun. Nominal notifikasi
dibandingkan dengan `orders.amount` sebelum order ditandai lunas.

### Verifikasi cepat

```bash
# buat sesi pembayaran (butuh kredensial DOKU)
curl -sS -X POST "$APP/api/checkout" -H 'Content-Type: application/json' \
  -d '{"planId":"STARTER","name":"Nama","email":"a@b.co","phone":"08123456789"}'

# status order (publik, tanpa email/telepon)
curl -sS "$APP/api/orders/<INVOICE>"

# daftar order untuk admin (butuh sesi)
curl -sS -b cookie.txt "$APP/api/admin/orders"
```

---

## Verifikasi

```bash
npm run typecheck
npm run build

# E2E lokal (butuh server + fake Places)
npm run fake:places                     # terminal 1 → :4010
npm run dev                             # terminal 2 → :3000
E2E_SUPERADMIN_EMAIL=<email-seed> E2E_SUPERADMIN_PASSWORD=<password-seed> \
  BASE=http://127.0.0.1:3000 npm run test:e2e
```

Skenario E2E mencakup login/RBAC (403 admin/user), isolasi kategori,
pagination + filter status website, normalisasi nomor, batas 100 prospek, counter hit
atomik, audit log per endpoint, update status, export CSV, dan pencabutan sesi
saat logout. Jalankan pada database kosong (reset `DATABASE_URL` bila perlu).

---

## Deployment

Aplikasi **membutuhkan Node runtime + database persisten**. GitHub Pages tidak
dapat menjalankan route handler, cookie sesi, maupun database, sehingga build
static/demo sudah dihapus.

- Docker: `Dockerfile` (Node 22 + migrasi otomatis sebelum start).
- Compose: `docker-compose.yml` (app + PostgreSQL + volume).
- Panduan langkah demi langkah untuk agent/VPS: [`docs/DEPLOY_PROMPT.md`](docs/DEPLOY_PROMPT.md).
- Reverse proxy (Nginx/Caddy) → port 3000, set `X-Forwarded-Proto: https`.
- Health check: `GET /api/health`.
- Migrasi manual: `DATABASE_URL=… npm run db:migrate` (idempotent).

Detail langkah dan diagram: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
