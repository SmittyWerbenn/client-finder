# ClientFinder

Platform prospecting untuk menemukan bisnis lokal yang **belum punya website**
melalui Google Places API, mengelola pipeline lead, melakukan outreach WhatsApp,
dan mengaudit setiap pemakaian API — dengan RBAC tiga level (Superadmin, Admin,
User) dan dukungan database **SQLite maupun PostgreSQL**.

Dokumen arsitektur lengkap (diagram alur, matriks RBAC, skema, deployment):
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Fitur

- **Pencarian prospek** dari Google Places Text Search (`"<keyword> di <kota>"`),
  pagination 20/halaman, plafon 100 prospek tanpa website per pencarian.
- **Filter wajib tanpa website** + Place Details terbatas untuk melengkapi
  nomor telepon.
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
pagination + filter website, normalisasi nomor, batas 100 prospek, counter hit
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
