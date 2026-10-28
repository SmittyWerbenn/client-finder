# Arsitektur ClientFinder

Dokumen ini menjelaskan alur sistem, matriks RBAC, skema database, dan operasi
deployment production. Aplikasi berjalan di **Node runtime** (Next.js App
Router 16), bukan static export.

---

## 1. Alur Sistem (end-to-end)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. LOGIN & SESSION                                                       │
│                                                                          │
│  Browser ──POST /api/auth/login {email,password}──► Route Handler        │
│                                                      │                  │
│                              rate-limit 8/10m ◄──────┤                  │
│                              scrypt verify  ◄─────────┤                  │
│                              users.is_active ◄────────┤                  │
│                                                      ▼                  │
│                              JWT HS256 (sub, role, ver)                 │
│                              Set-Cookie cf_session httpOnly, SameSite=Lax│
│                                                      │                  │
│  Setiap request berikutnya:                                             │
│  Cookie ──► proxy.ts (verify JWT, gate halaman/API)                     │
│              │                                                          │
│              ▼                                                          │
│         Server Component / Route Handler                                │
│              └── getSessionUser(): verifikasi ulang ke DB               │
│                  (role terbaru, is_active, session_version)             │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ 2. PENCARIAN & API HIT TRACKING                                          │
│                                                                          │
│  UI /console ──POST /api/search {mode,categoryId|name,city}──►           │
│                                                                          │
│   requireUser() ──► kategori milik user (user-scoped)                    │
│        │                                                                 │
│        ├── assertQuota(): counter bulanan user + platform                │
│        ▼                                                                 │
│   searchProspects() (lib/places.ts)                                      │
│        │                                                                 │
│        ├─ Text Search  POST places:searchText                            │
│        │     query = "<keyword> di <kota>" · 20/hal · nextPageToken      │
│        │     jeda 2,5 dtk · retry token belum aktif                      │
│        │     └─► recordApiHit(endpoint=TEXT_SEARCH)  [atomik]            │
│        │                                                                 │
│        ├─ Filter ketat: websiteUri kosong? (yang punya website dibuang)  │
│        │                                                                 │
│        ├─ Place Details GET places/{id}  (maks 20/pencarian)             │
│        │     hanya untuk lead tanpa nomor · field mask minimal           │
│        │     └─► recordApiHit(endpoint=PLACE_DETAILS) [atomik]           │
│        │                                                                 │
│        ├─ Normalisasi nomor → 62xxx (wa.me)                              │
│        ├─ Dedupe placeId · plafon 100 prospek · stop token habis         │
│        ▼                                                                 │
│   saveSearchLeads(): UPSERT (owner_id, place_id)                         │
│        status lama TIDAK ditimpa                                         │
│        ▼                                                                 │
│   Response { leads, meta, usage }                                        │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ 3. OUTREACH & LEAD MANAGEMENT                                            │
│                                                                          │
│  Lead ──► Kirim WA 1-klik (wa.me?text=template terisi)                   │
│       ──► Broadcast massal (client queue, jeda 3/5/10 dtk)               │
│             setiap tab dibuka → PATCH /api/leads/{id} {status}           │
│             status otomatis Contacted                                    │
│       ──► LinkedIn X-Ray (Google site:linkedin.com/in …)                 │
│       ──► Export CSV (server-side, scoped role, ≤1000 baris)             │
│                                                                          │
│  Admin/Superadmin ──► /console/leads: tambah/edit/hapus lead             │
│  Superadmin      ──► /console/users: CRUD user, role, reset password     │
│  Admin+          ──► /console/api-usage: total hit, per user, log        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Titik pencatatan hit (atomic)

`lib/api-tracker.ts → recordApiHit()` menulis **dua statement dalam satu batch
transaksi**:

1. `INSERT INTO api_usage_logs (...)` — userId, endpoint, query, status,
   httpStatus, placeId, durasi, timestamp.
2. `INSERT INTO api_usage_counters (user_id, period, hits) VALUES (...,1)
   ON CONFLICT (user_id, period) DO UPDATE SET hits = hits + 1`.

Karena satu transaksi, tidak mungkin ada log tanpa penambahan counter
(walau request paralel). Panggilan yang gagal (error HTTP/network) juga dicatat
dengan `status = ERROR` dan `http_status` yang sesuai.

---

## 2. Matriks RBAC

| Kemampuan | SUPERADMIN | ADMIN | USER |
|---|:--:|:--:|:--:|
| Login & pencarian prospek | ✅ | ✅ | ✅ |
| Melihat hasil pencarian / lead miliknya | ✅ semua | ✅ semua | ✅ miliknya |
| Update status pipeline lead | ✅ semua | ✅ semua | ✅ miliknya |
| Tambah/edit/hapus lead (CRUD DB) | ✅ | ✅ | ❌ (403) |
| Export CSV | ✅ | ✅ | ✅ (scoped) |
| Broadcast WhatsApp | ✅ | ✅ | ✅ |
| Kategori: lihat | semua | global + miliknya | miliknya |
| Kategori: CRUD | semua (termasuk global) | miliknya | miliknya |
| API Usage Metrics (`/console/api-usage`, `/api/admin/usage`) | ✅ | ✅ | ❌ (403) |
| Manajemen user (`/console/users`, `/api/admin/users`) | ✅ | ❌ (403) | ❌ (403) |
| Menetapkan kategori ke user lain | ✅ | ❌ | ❌ |

Penegakan berlapis:

1. **`proxy.ts`** — cek JWT + role untuk halaman dan endpoint admin.
2. **`requireUser` / `requireRole`** di setiap route handler — verifikasi ulang
   ke database (role bisa berubah, user bisa dinonaktifkan).
3. **Repository** — aturan ownership (`owner_id`) untuk kategori dan lead.

Role disimpan sebagai teks dengan domain tetap `ROLES = SUPERADMIN | ADMIN |
USER` (`lib/db/schema.ts`), divalidasi Zod di boundary API. Pendekatan ini
portabel SQLite & PostgreSQL tanpa perbedaan tipe enum antar dialek.

---

## 3. Skema Database

```
users
  id TEXT PK · email TEXT UNIQUE · name · password_hash · role TEXT
  is_active BOOLEAN · session_version INT · created_at BIGINT(ms) · updated_at

categories
  id TEXT PK · owner_id FK users NULL (NULL = global)
  sector · sub_category · keyword · pitch · is_global BOOLEAN
  created_at · updated_at

client_leads
  id TEXT PK · owner_id FK users · place_id
  name · address · city · phone_raw · phone_display · whatsapp · website
  rating REAL · reviews INT · maps_url · sector · sub_category · pitch
  status TEXT (New|Contacted|Interested|Closed)
  source TEXT (SEARCH|MANUAL) · created_at · updated_at
  UNIQUE(owner_id, place_id) · INDEX(owner_id) · INDEX(status)

api_usage_logs
  id TEXT PK · user_id FK users · endpoint (TEXT_SEARCH|PLACE_DETAILS)
  query_param · status (SUCCESS|ERROR) · http_status · place_id
  duration_ms · created_at
  INDEX(created_at) · INDEX(user_id)

api_usage_counters
  user_id FK users · period TEXT (YYYY-MM) · hits INT · updated_at
  PRIMARY KEY(user_id, period)
```

Definisi Drizzle:

- SQLite: `lib/db/schema.ts` → migrasi `drizzle/sqlite/*.sql`
- PostgreSQL: `lib/db/schema.pg.ts` → migrasi `drizzle/postgres/*.sql`

Semua timestamp adalah **BIGINT epoch milliseconds**; boolean native di
PostgreSQL dan 0/1 di SQLite (dinormalkan adapter).

---

## 4. Lapisan Data (SQL portabel)

```
Route Handler / Server Component
        │
        ▼
lib/repositories/{users,categories,leads}.ts   ← aturan bisnis + ownership
        │
        ▼
lib/db/index.ts → getDatabase(): migrasi + seed sekali, lalu adapter
        │
        ├── SqliteAdapter  (@libsql/client)   DATABASE_URL=file:…
        └── PostgresAdapter (pg Pool)         DATABASE_URL=postgres://…
```

Repository menulis SQL dengan placeholder `?`; `PostgresAdapter` mengubahnya
menjadi `$1..$n`. Batch = transaksi (`BEGIN…COMMIT` / libSQL batch). Dengan
begitu satu jalur kode melayani kedua database.

---

## 5. Migrasi & Seed

```bash
# Generate file migrasi setelah schema diubah
npm run db:generate        # SQLite  → drizzle/sqlite/
npm run db:generate:pg     # Postgres → drizzle/postgres/

# Terapkan migrasi (dipakai CI/deploy; runtime juga auto-migrate saat boot)
DATABASE_URL=... npm run db:migrate
```

`lib/db/migrate.ts` menerapkan semua file `.sql` yang belum tercatat di tabel
`__migrations`, dalam transaksi. Bootstrap berikutnya:

1. Kategori global dari `lib/seed.ts` (jika belum ada).
2. Superadmin dari `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD`
   (hanya jika belum ada Superadmin aktif). Tidak ada password bawaan.

---

## 6. Deployment

Aplikasi membutuhkan Node 22+ dan database persisten. **GitHub Pages tidak
bisa** menjalankan route handler/cookie/DB, sehingga workflow static demo
dihapus.

### Docker Compose (PostgreSQL)

```bash
cp .env.example .env        # isi NEXTAUTH_SECRET, Google key, seed, POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec app node scripts/migrate.mjs   # opsional, CMD sudah menjalankannya
curl localhost:3000/api/health
```

`docker-compose.yml` menjalankan `postgres:16-alpine` + aplikasi; volume
`pgdata` menyimpan data. Untuk SQLite, jalankan tanpa compose:

```bash
DATABASE_URL=file:/data/clientfinder.db npm run db:migrate
DATABASE_URL=file:/data/clientfinder.db npm start
```

### Reverse proxy

Letakkan Nginx/Caddy di depan port 3000, teruskan `X-Forwarded-Proto: https`,
dan set `NEXTAUTH_URL=https://domain-anda`. Cookie otomatis `Secure` bila
request HTTPS (`FORCE_SECURE_COOKIES=true` untuk memaksa).

### Health check

`GET /api/health` → `{ ok:true, data:{status:'ok',database:'postgres',latencyMs} }`
(tanpa autentikasi, tanpa data sensitif).

---

## 7. Keamanan

- Password: scrypt (N=16384) + salt acak; tidak pernah dikembalikan API.
- JWT HS256 di cookie `httpOnly`, `SameSite=Lax`, `Secure` di HTTPS.
- `session_version` dinaikkan saat logout / reset password / perubahan
  role-status → token lama langsung tidak valid (juga diverifikasi ke DB).
- Login rate limit 8 percobaan / 10 menit per IP+email (in-memory; gunakan
  Redis bila multi-instance).
- Otorisasi dicek ulang di handler, bukan hanya proxy.
- Semua query berparameter (tidak ada string interpolation input).
- Response error seragam: `{ ok:false, error:{ code, message, details? } }`
  tanpa stack trace.
- Header keamanan: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`.
- API key Google hanya di server (`X-Goog-Api-Key`), tidak pernah ke browser.

---

## 8. Kuota

| Env | Default | Fungsi |
|---|---:|---|
| `API_HIT_MONTHLY_LIMIT` | 5000 | Plafon hit platform/bulan (semua role). |
| `USER_MONTHLY_HIT_LIMIT` | 500 | Plafon hit role USER/bulan. |

`assertQuota()` dijalankan sebelum pencarian; bila habis → HTTP 429
`QUOTA_EXCEEDED`. Konsumsi dapat dilihat di `/console/api-usage` dan chip
sidebar.
