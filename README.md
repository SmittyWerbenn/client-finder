# Client Finder — Panduan Developer

[![CI](https://github.com/SmittyWerbenn/client-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/SmittyWerbenn/client-finder/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/SmittyWerbenn/client-finder/actions/workflows/pages.yml/badge.svg)](https://github.com/SmittyWerbenn/client-finder/actions/workflows/pages.yml)
[![Demo statis](https://img.shields.io/badge/demo-client--finder.frel.cloud-2ea44f)](https://client-finder.frel.cloud/)

Demo statis (data contoh, tanpa server): <https://client-finder.frel.cloud/dashboard/>

Aplikasi pencarian prospek (calon klien) dari **Google Places API (New)** untuk agensi jasa
pembuatan website. Nilai jualnya satu kalimat: *tampilkan usaha yang **belum punya website***,
lengkap dengan nomor WhatsApp dan pitch angle siap pakai.

Satu proses, satu repo: Next.js 16 App Router (React 19) untuk frontend **dan** backend.
Tanpa PostgreSQL/MySQL — data disimpan di satu file JSON lokal.

Dokumen ini fokus pada **alur aplikasi** dan **problematika/utang teknis**, bukan sekadar
daftar folder. Versi terverifikasi: `npm run typecheck` lolos, `npm run build` lolos
(Next.js 16.4.3, Turbopack), Node 26.

---

## 1. Setup cepat

```bash
npm install
cp .env.example .env.local     # isi minimal APP_ADMIN_PASSWORD & SESSION_SECRET
npm run dev                    # http://localhost:3000
```

| Variabel | Wajib | Dipakai di | Keterangan |
|---|---|---|---|
| `GOOGLE_PLACES_API_KEY` | tidak | `lib/places.ts` | Kosong → aplikasi jalan penuh dalam **mode demo** (data contoh deterministik). |
| `APP_ADMIN_PASSWORD` | ya | `app/api/auth/login/route.ts` | Satu password admin. Kosong → login balas 500 dengan pesan jelas. |
| `SESSION_SECRET` | ya (produksi) | `lib/auth.ts` | HS256 signing key. Kosong → pakai fallback dev (lihat §6.1). |
| `SESSION_TTL_HOURS` | tidak | `lib/auth.ts` | Default **12**, valid 1–720. |
| `DB_FILE_NAME` | tidak | `lib/db.ts` | Nama file di dalam `data/`, default `db.json`. Path-nya **tidak** bisa keluar dari `data/`. |
| `FORCE_SECURE_COOKIES` | tidak | `lib/auth.ts` | `true` → cookie `Secure` walau diakses via http (butuh HTTPS di depan). |

Perintah:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | dev server Turbopack |
| `npm run build` / `npm start` | build produksi / jalankan hasil build |
| `npm run typecheck` | `tsc --noEmit` — **satu-satunya gate otomatis** yang ada saat ini |

Alias import: `@/*` → root repo (bukan `src/`). Tidak ada ESLint/Prettier di repo.

---

## 2. Alur aplikasi

### 2.1 Peta request

`proxy.ts` (pengganti `middleware` di Next 16) mencegat **hanya** `/dashboard/:path*` dan
`/api/:path*`:

```
                     ┌─ belum login ─→ redirect /login?next=...
/dashboard/**  ──────┤
                     └─ JWT valid ───→ lanjut ke server component

                     ┌─ /api/auth/login ─→ publik
/api/**        ──────┤
                     └─ lainnya ─→ tanpa cookie valid = 401 JSON {code:"UNAUTHORIZED"}
```

Halaman `/` tidak masuk matcher; ia redirect sendiri berdasarkan isi cookie
(`app/page.tsx`). Halaman `/login` kalau sudah punya session valid langsung dilempar ke
`/dashboard` (biar tidak bisa "login dua kali").

| Endpoint | Method | Auth | File |
|---|---|---|---|
| `/api/auth/login` | POST | publik | `app/api/auth/login/route.ts` |
| `/api/auth/logout` | POST | wajib | `app/api/auth/logout/route.ts` |
| `/api/categories` | GET, POST | wajib | `app/api/categories/route.ts` |
| `/api/categories/[id]` | GET, PUT, DELETE | wajib | `app/api/categories/[id]/route.ts` |
| `/api/categories/reset` | POST | wajib | `app/api/categories/reset/route.ts` |
| `/api/search` | POST | wajib | `app/api/search/route.ts` |
| `/api/export` | POST | wajib | `app/api/export/route.ts` |

Semua route yang menyentuh store memakai `export const dynamic = 'force-dynamic'` — jangan
dihapus, kalau tidak Next akan mencoba meng-cache respons yang isinya berubah-ubah.

### 2.2 Alur login & session

1. `LoginForm` → POST `/api/auth/login` `{ password }`.
2. Route menghitung IP dari `x-forwarded-for` (ambil hop pertama) atau `x-real-ip`, lalu cek
   rate limit in-memory: **8 percobaan / 10 menit / IP**. Percobaan ke-9 → `429`.
3. Password dibandingkan dengan `timingSafeEqual` (dan tetap menjalankan perbandingan walau
   panjang beda, supaya durasi tidak membocorkan panjang password).
4. Sukses → counter IP dihapus, `SignJWT({role:'admin'}).setSubject('admin')` HS256
   ditandatangani `SESSION_SECRET`, dikirim sebagai cookie `cf_session`
   (`HttpOnly`, `SameSite=Lax`, `Secure` hanya kalau request benar-benar HTTPS —
   lihat `requestUsesHttps()`, yang menghormati `x-forwarded-proto`).
5. `/dashboard` adalah server component: verifikasi token lagi dari cookie, lalu
   `listCategories()` dan hitung `mockMode` dari env, baru render `<Dashboard>` (client).
6. Logout → POST `/api/auth/logout`, cookie di-set `maxAge: 0`, client `router.replace('/login')`.

Token hanya berisi `sub` dan `role`. Tidak ada data user di cookie, tidak ada refresh token —
sesi mati setelah TTL atau kalau `SESSION_SECRET` diganti.

### 2.3 Alur pencarian prospek (inti aplikasi)

```
Dashboard.tsx                  /api/search                  lib/places.ts
─────────────                  ───────────                  ─────────────
submit form
  categoryId, city ─────────▶ validasi input
                               getCategory(id) ───────────▶ lib/db.ts (baca JSON)
                               searchProspects()
                                 ├ cacheKey = id|kota (TTL 10 menit)
                                 ├ loop halaman (token mulai null)
                                 │   [halaman > 0] tunggu 2,5 detik
                                 │     POST places:searchText
                                 │     textQuery="<keyword> di <kota>"
                                 │     pageSize=20 + pageToken bila ada
                                 │     setiap place: punya website? buang
                                 │     sisanya → toProspect()
                                 │   stop bila token habis / halaman kosong
                                 │   atau 100 prospek tanpa website tercapai
                                 └ hasil ≤ 100 + meta
                               ◀──────── { ok, meta, results }
setResults / setMeta
render tabel + metrik
```

Detail yang menentukan perilaku:

- **Filter website** (`hasWebsite`): place dianggap punya website bila `websiteUri` berupa
  string dengan isi apa pun selain kosong. Hanya `null` / `undefined` / `""` yang lolos ke
  daftar prospek. Place tanpa telepon **tetap ditampilkan** (ditandai "Nomor tidak tersedia")
  karena masih bisa didekati offline.
- **Wilayah itu dropdown, bukan teks bebas.** Provinsi dan kota diambil dari `lib/locations.ts`
  (6 provinsi, 99 kota/kabupaten di Pulau Jawa). `province` hanya state UI — yang dikirim ke
  `/api/search` tetap `city`, jadi menambah wilayah cukup edit satu file itu. Nilai `city`
  dipakai mentah di query dan sebagai bagian cache key, jadi jangan ubah ejaan tanpa
  membersihkan cache.
- **Tidak ada radius/koordinat.** Cakupan wilayah murni dari text query
  `"<keyword> di <kota>"` (Text Search), tanpa `locationBias` / `locationRestriction` /
  geocode. Jangan janjikan "hanya dalam radius X km" ke user.
- **Hard limit 100 prospek.** Satu request ke `/api/search` memindai halaman demi halaman
  sampai `nextPageToken` habis **atau** 100 prospek tanpa website terkumpul; begitu 100
  tercapai loop langsung berhenti (tidak ada request Google tambahan). `meta.capped`
  menandai kondisi ini.
- **Jeda antar halaman wajib.** `NEXT_PAGE_DELAY_MS` = 2500 ms sebelum memakai
  `nextPageToken`; token yang dipanggil terlalu cepat ditolak `INVALID_REQUEST`. Bila tetap
  ditolak, `fetchPage()` menunggu satu jeda lagi dan retry maksimal 2 kali.
- **Batas biaya**: field mask minimal, `pageSize: 20`, guard `MAX_RAW_PAGES` = 10 halaman
  mentah per pencarian agar loop tidak pernah tak berujung.
- **Cache**: hasil satu pemindaian penuh disimpan di `globalThis` per `(kategori, kota)`
  selama **10 menit**, maksimal 40 entri (LRU). `refresh: true` (tombol **Muat Ulang**)
  membuang cache → pemindaian baru.
- **Mode demo** (`GOOGLE_PLACES_API_KEY` kosong): `mockPage()` menghasilkan 20 tempat per
  halaman dari PRNG `mulberry32` yang di-seed dari `(cacheKey, pageIndex)`, ±35% punya
  `websiteUri`, 8 halaman (160 mentah) supaya plafon 100 bisa tersentuh. Tanpa jeda 2,5 detik
  agar demo tetap cepat. Data deterministik: kota + kategori sama → hasil sama.
  `meta.mock = true` → badge "Mode demo" di topbar.
- **Metrik di UI** dihitung dari `meta`: total lolos filter, jumlah tempat dipindai
  (+ halaman Google), jumlah yang dilewati karena sudah punya website, rata-rata rating,
  jumlah yang punya nomor.

### 2.4 Alur export CSV

1. User klik **Export CSV** → client memakai seluruh baris yang sudah dimuat (maksimal 100
   — satu pencarian sudah memindai sampai plafon, jadi tidak ada request tambahan).
2. Dedupe berdasarkan `placeId` di client.
3. POST `/api/export` `{ rows, sector, city }`. Server **tidak** mempercayai isi baris:
   `sanitizeRows()` membatasi 2000 baris, memaksa tipe tiap field, dan **menormalkan ulang**
   nomor telepon. CSV dibangun ulang di server (`lib/csv.ts`).
4. Respons `text/csv; charset=utf-8` + `Content-Disposition: attachment; filename="prospek-<sektor>-<kota>-<tanggal>.csv"`,
   body diawali BOM UTF-8 dan memakai CRLF supaya rapi di Excel. Client membaca nama file dari
   header, membuat blob, dan memicu download lewat `<a download>`.

### 2.5 Alur kategori

- Seeder (`lib/seed.ts`): **4 sektor, 14 sub-kategori**, masing-masing punya `keyword` Google
  Maps dan `pitch` (rekomendasi fitur website).
  Sektor: Fasilitas Olahraga & Sewa Tempat · Makanan & Minuman (F&B) · Toko Fisik &
  Penjualan Barang Jadi · Jasa & Produksi Custom.
- `readDb()` otomatis menanam seeder kalau file belum ada **atau** array `categories` kosong.
- CRUD lewat `CategoryManager` (modal, client component) → `onChange` mengangkat state ke
  `Dashboard` supaya dropdown langsung ikut berubah tanpa reload.
- Validasi ada di server (`validateInput`): sektor/sub-kategori/keyword min 2 karakter, pitch
  min 10 karakter, batas panjang 80/80/120/700, dan **duplikat (sektor + sub-kategori,
  case-insensitive) ditolak**.
- `POST /api/categories/reset` menanam ulang default **tanpa menghapus kategori custom**
  (`isDefault: false` dipertahankan).

---

## 3. Model data & lifecycle

`data/db.json` (gitignored, dibuat otomatis):

```jsonc
{
  "version": 1,
  "categories": [ { "id", "sector", "subCategory", "keyword", "pitch",
                    "isDefault", "createdAt", "updatedAt" } ]
}
```

- Tulis: `JSON.stringify` ke `data/db.json.<pid>.tmp` lalu `rename` (atomic), diserialisasi
  lewat queue `globalThis.__clientFinderDbQueue` supaya request paralel tidak saling menimpa.
  Queue disimpan di `globalThis` agar bertahan saat hot-reload dev.
- Baca: file korup (JSON invalid) → di-rename ke `db.json.corrupt-<ts>`, store di-reset ke
  seeder, aplikasi tetap hidup. Tidak ada backup otomatis selain file `*.corrupt-*` itu.
- **Hasil pencarian tidak pernah disimpan.** Tidak ada tabel prospek, tidak ada riwayat.
  Tutup tab / refresh → daftar hilang, harus cari ulang (dan itu berarti memanggil Google lagi).

---

## 4. Struktur file

```
app/
  layout.tsx                     metadata + globals.css
  page.tsx                       /  → redirect sesuai session
  login/page.tsx                 halaman login (server) + LoginForm
  dashboard/page.tsx             cek session, ambil kategori, render Dashboard
  globals.css                    tema navy/putih; tabel jadi kartu di mobile
  api/**/route.ts                route handler (lihat tabel §2.1)
components/
  LoginForm.tsx                  form login + error inline
  Dashboard.tsx                  shell: form cari, metrik, export, toast, modal
  ProspectTable.tsx              tabel prospek, skeleton, empty state, link wa.me
  CategoryManager.tsx            CRUD kategori
lib/
  places.ts                      klien Places Text Search, loop + cap 100, filter website
  locations.ts                   daftar provinsi + kota Pulau Jawa (sumber dropdown)
  db.ts                          JSON store, lock queue, seeder, error class
  seed.ts                        14 sub-kategori default
  auth.ts                        JWT sign/verify, opsi cookie, deteksi HTTPS
  phone.ts                       normalisasi nomor Indonesia → wa.me (62…)
  csv.ts                         builder CSV (BOM, escaping) + nama file
  types.ts                       tipe bersama FE/BE
proxy.ts                         proteksi route global
data/db.json                     store (gitignored)
```

Konvensi error API: `{ ok: false, error: "<pesan bahasa Indonesia>", code?: string }`.
Sukses selalu `{ ok: true, ... }`. Pesan error sengaja berbahasa Indonesia dan siap
ditampilkan langsung ke UI.

---

## 5. Kontrak API (ringkas)

```
POST /api/auth/login      { password }
  → 200 { ok:true } + Set-Cookie cf_session
  → 400 body invalid | 401 password salah | 429 rate limit | 500 password belum diset

POST /api/search          { categoryId, city, refresh? }
  → 200 { ok:true, meta:{ sector, subCategory, keyword, pitch, city, query,
            limit, scanned, skippedWithWebsite, totalQualified,
            pagesScanned, capped, mock }, results: Prospect[] }   // results ≤ 100
  → 400 validasi | 404 kategori hilang | 401 | 429 kuota Google | 502/504 error Google

POST /api/export          { rows: Prospect[], sector?, city? }
  → 200 text/csv (attachment) | 400 rows kosong

GET  /api/categories                       → { ok:true, categories }
POST /api/categories      { sector, subCategory, keyword, pitch }
  → 201 { ok:true, category } | 400 validasi/duplikat
GET/PUT/DELETE /api/categories/:id         → 404 kalau tidak ada
POST /api/categories/reset                 → { ok:true, categories }
```

`Prospect` = `placeId, name, address, phoneRaw, phoneDisplay, whatsapp, website, rating,
reviews, mapsUrl, sector, subCategory, pitch`.

---

## 6. Problematika & batasan (baca sebelum deploy/refactor)

### 6.1 Keamanan

1. **`SESSION_SECRET` punya fallback dev** (`'client-finder-dev-secret-change-me-min-32-chars'`).
   Kalau lupa diset di produksi, aplikasi tetap jalan dan siapa pun yang tahu konstanta itu bisa
   memalsukan JWT. Belum ada guard "refuse to boot in production without secret" — kandidat
   perbaikan pertama.
2. **Satu password, tanpa user/role.** Tidak ada audit trail siapa melakukan apa. Kalau butuh
   multi-user, seluruh lapisan auth harus diganti (tabel user + hash password + role).
3. **Rate limit in-memory & mempercayai `x-forwarded-for`.** Restart = counter reset; multi
   instance = limit terpisah per proses; header bisa dipalsukan kalau tidak ada reverse proxy
   yang menimpanya.
4. **Tidak ada token CSRF.** Mitigasinya hanya `SameSite=Lax` + `Content-Type: application/json`.
   Cukup untuk tool internal, tapi bukan pertahanan lengkap.
5. **Tidak ada revoke sesi.** Ganti password tidak membatalkan cookie yang sudah beredar —
   harus ganti `SESSION_SECRET` (dan itu me-logout semua orang sekaligus).

### 6.2 State & data

6. **Cache hasil hidup di memori proses.** Cache 40 entri / TTL 10 menit hilang saat restart;
   pencarian yang sama akan memanggil Google lagi (biaya naik) dan daftarnya bisa berbeda.
7. **Tidak bisa multi-instance / serverless.** Store JSON lokal + cache di memori proses.
   Dua replika = dua kebenaran berbeda; Vercel/Lambda = filesystem read-only/ephemeral.
   Aplikasi ini **butuh satu proses Node dengan disk writable** (VPS, docker single replica).
8. **Hasil pencarian tidak dipersist.** Tidak ada riwayat, tidak ada dedupe antar sesi.
   Export adalah satu-satunya jalur keluar data.
9. **`readDb()` menanam ulang seeder saat kategori kosong.** Menghapus semua kategori lewat UI
   akan memunculkan 14 kategori default lagi pada request berikutnya — bukan bug, tapi
   mengejutkan dan perlu diketahui saat menguji.
10. **Cache key hanya `id|kota`.** Dua pencarian dengan kota sama tapi maksud wilayah berbeda
    (mis. "Bandung" vs "Kab. Bandung") berbagi entri cache yang sama.
11. **Tidak ada migrasi skema.** `version: 1` hanya konstanta; kalau `DbShape` berubah, file
    lama dibaca apa adanya. Perubahan bentuk data harus ditangani manual/kompatibel.

### 6.3 Kualitas hasil pencarian

12. **`websiteUri` bukan bukti "tidak punya website".** Usaha yang hanya punya linktree,
    Instagram, atau halaman marketplace kemungkinan tetap punya `websiteUri` → ikut terbuang
    (false negative). Sebaliknya, listing yang tidak mencantumkan situs padahal punya → lolos
    filter (false positive). Ini batas akurasi sumber data, bukan bug yang bisa ditutup di kode.
13. **Text Search tidak membatasi wilayah.** `"<keyword> di <kota>"` adalah petunjuk, bukan
    filter — Google masih bisa mengembalikan tempat di kota lain / luar Jawa. Tidak ada
    verifikasi `addressComponents` per hasil, jadi "di Jakarta Selatan" bukan jaminan.
14. **Kota terlalu umum / salah ketik** membuat Google mengembalikan hasil acak tanpa error.
    Dropdown mengurangi salah tulis, tapi tidak ada validasi bahwa kota benar-benar dikenali
    (tidak ada lagi geocode yang bisa memicu `ZERO_RESULTS` → 502).
15. **Plafon biaya tidak kelihatan.** Satu pencarian baru = sampai 10 halaman mentah × 20 hasil
    (nyatanya Google berhenti di ~3 halaman / 60 hasil) + jeda 2,5 detik antar halaman, jadi
    request bisa berjalan belasan detik. Tidak ada counter biaya/kuota di UI. Kuota habis →
    `429` dengan pesan Google yang diteruskan apa adanya.
16. **Mode demo bisa menyesatkan.** Nama usaha dirakit dari daftar kata (`Arena Jaya <core>`),
    alamat dari daftar jalan, semua fiktif. Jangan pakai screenshot mode demo untuk materi
    jualan tanpa label.

### 6.4 UX & frontend

17. **Export = seisi tabel.** Satu pencarian sudah memindai sampai plafon, jadi CSV berisi
    maksimal 100 baris (batas server 2000 tidak pernah tersentuh).
18. **Tidak ada pembatalan request.** Pencarian bisa berjalan belasan detik (jeda antar
    halaman Google); tombol dinonaktifkan selama loading, tapi tidak ada `AbortController`.
19. **Tabel tidak punya sorting/filter/kolom pilihan.** Semua hasil tampil sekaligus (≤100),
    urutannya urutan Google.
20. **Toast/error bersifat sementara dan hilang saat reload** — tidak ada log aktivitas.

### 6.5 Tooling

21. **Tidak ada test otomatis sama sekali** (tidak ada Jest/Vitest/Playwright), juga tidak ada
    ESLint. Regression hanya tertangkap lewat `tsc` dan smoke test manual (§7).
22. **`tsconfig.tsbuildinfo`** ikut di root dan gitignored — aman, tapi jangan bingung kalau
    `typecheck` terasa "tidak jalan": incremental cache.

---

## 7. Smoke test manual (jalankan setelah perubahan besar)

Mode demo, `npm run build && npm start`:

1. `/dashboard` tanpa cookie → 307 ke `/login`; `/api/search` tanpa cookie → 401 `UNAUTHORIZED`.
2. Login password salah → 401; 9× berturut-turut → 429.
3. Login benar → `Set-Cookie: cf_session=…; HttpOnly; SameSite=Lax`; `/login` sekarang redirect
   ke `/dashboard`.
4. Pencarian default (Jakarta Selatan) → semua baris tanpa `website`, jumlah ≤ 100, badge
   "Mode demo" tampil, metrik `Dipindai` ≥ jumlah baris (mock memakai 8 halaman × 20).
5. Metrik `Dilewati` > 0 (mock menyisipkan ±35% tempat ber-website yang harus dibuang).
6. "Muat Ulang" → `?refresh=1`, hitungan `Dipindai` mulai dari 0 lagi (cache dilewati).
7. Export CSV → file terunduh, header bahasa Indonesia, baris = jumlah di tabel, karakter
   `&`/kutip aman, terbuka rapi di Excel.
8. Kategori: tambah → muncul di dropdown tanpa reload; duplikat (sektor+sub-kategori sama) →
   error 400; reset → 14 default kembali, kategori custom tetap ada (termasuk setelah hapus
   semua kategori, karena seeder otomatis menanam ulang).
9. Logout → cookie hilang, `/dashboard` balik ke `/login`.

---

## 8. Kalau mau menambah fitur

- **Kategori baru permanen**: tambahkan ke `DEFAULT_CATEGORIES` di `lib/seed.ts` (jangan
  mengubah `id` yang sudah ada — dipakai sebagai cache key), lalu
  `POST /api/categories/reset` atau hapus `data/db.json`.
- **Wilayah baru (provinsi/kota)**: tambahkan ke `JAVA_PROVINCES` di `lib/locations.ts`; UI
  membangun kedua dropdown dari situ. Kalau menambah provinsi di luar Jawa, tambahkan grup baru
  di array yang sama — `defaultCityFor()` dan `provinceOfCity()` otomatis ikut.
- **Field baru dari Google**: tambahkan ke `SEARCH_FIELD_MASK` (`lib/places.ts`) → tambahkan
  ke `GooglePlace` → map di `toProspect()` → tambahkan ke `Prospect` di `lib/types.ts` →
  tampilkan di `ProspectTable` → tambahkan kolom di `HEADERS` + `buildProspectCsv` supaya
  export ikut. Field mask menambah biaya billing — jangan asal tambah.
- **Endpoint baru**: ikuti pola yang ada — `force-dynamic`, validasi manual input, balas
  `{ ok, ... }`, lempar error class (`ValidationError`/`NotFoundError`/`PlacesError`) dan
  petakan ke status HTTP di route, jangan bocorkan pesan internal.
- **Menyentuh store**: selalu lewat `withLock()` di `lib/db.ts`; jangan `fs.writeFile` langsung.
- **Kalau butuh multi-instance / deploy serverless**: ganti store JSON + cache pencarian ke
  Postgres/Redis lebih dulu. Ini perubahan arsitektur, bukan sekadar ganti env.

## 9. Backlog yang paling masuk akal

1. Guard `SESSION_SECRET` wajib di produksi + fail-fast saat boot.
2. Test: unit untuk `phone.ts`, `csv.ts`, `hasWebsite`, `validateInput`; integrasi route dengan
   `next start` + mode demo.
3. Export dengan indikator progres + opsi filter sebelum unduh.
4. Persist hasil pencarian terakhir per kategori/kota supaya reload tidak memanggil Google lagi.
5. Sort/filter tabel (punya nomor, rating minimum, kata kunci alamat) + dedupe antar pencarian.
6. Tombol "buka semua WhatsApp" / template pesan per kategori.

## 10. Deploy: GitHub Actions & GitHub Pages

Repo: <https://github.com/SmittyWerbenn/client-finder> (branch `main`).

### 10.1 Dua workflow

| Workflow | File | Isi |
| --- | --- | --- |
| CI | `.github/workflows/ci.yml` | `npm ci` → `npm run typecheck` → `npm run build` (build server, tanpa export) pada setiap push `main` dan PR |
| Deploy Pages | `.github/workflows/pages.yml` | build **statis demo** lalu publikasi ke GitHub Pages |

### 10.2 Kenapa Pages hanya demo statis

GitHub Pages hanya menyajikan file statis. Aplikasi penuh butuh proses Node karena:

- `app/api/*` (search, export, auth, categories) adalah route handler dinamis,
- sesi login memakai cookie + `proxy.ts`,
- kategori disimpan di `data/db.json` lewat `lib/db.ts`.

Karena itu `pages.yml` menghapus `app/api` dan `proxy.ts` di runner sebelum build, lalu build
memakai env berikut:

```bash
NEXT_STATIC_EXPORT=1   # next.config.ts → output: 'export'
NEXT_PUBLIC_DEMO=1     # lib/demo.ts → pencarian & export dijalankan di browser
NEXT_BASE_PATH=''      # kosong: custom domain menyajikan artifact di root
```

Situs Pages dipasang di custom domain **<https://client-finder.frel.cloud/>** (DNS `CNAME` ke
`smittywerbenn.github.io`, proxied Cloudflare). Karena custom domain melayani artifact di **root**,
build **tidak boleh** memakai `basePath` — kalau diisi `/client-finder`, HTML meminta
`/client-finder/_next/...` yang tidak ada di root sehingga **CSS & JS 404** (halaman tampil tanpa
style). URL `smittywerbenn.github.io/client-finder/` otomatis 301 ke custom domain.

Hasilnya `out/` berisi `/`, `/login`, `/dashboard` sebagai halaman statis. Di mode ini:

- pencarian memakai generator data contoh `lib/mockSearch.ts` (seed di `data/mock-leads.json`, tanpa panggilan jaringan),
- tombol **Kelola Kategori** dan **Keluar** disembunyikan,
- export CSV dibuat di browser dari hasil yang sedang tampil,
- topbar menampilkan badge "Prototype mode" + switch **Demo / Mock** vs **Live API** (Live dinonaktifkan di build statis).

Build lokal untuk menguji Pages (tanpa mengubah source permanen):

```bash
mv app/api /tmp/api && mv proxy.ts /tmp/proxy.ts
NEXT_STATIC_EXPORT=1 NEXT_PUBLIC_DEMO=1 NEXT_BASE_PATH='' npm run build
mv /tmp/api app/api && mv /tmp/proxy.ts proxy.ts
python3 -m http.server 8099 --directory out   # buka /dashboard/
```

### 10.3 Deploy aplikasi penuh (butuh Node)

Jalankan `npm run build && npm start` di host yang mendukung proses Node (VPS, Render, Fly, Railway).
Isi `.env.local` dari `.env.example` — minimal `GOOGLE_PLACES_API_KEY`, `AUTH_PASSWORD`,
`SESSION_SECRET`. `data/db.json` harus persisten (volume) agar kategori tidak hilang saat redeploy.


## 11. Lapisan prototipe (multi-user, kredit, pipeline)

Prototype ini menambahkan simulasi SaaS lengkap tanpa database eksternal. Semua state demo hidup di
`localStorage` browser, jadi bisa didemokan langsung di build statis (Pages) maupun server Node.

### 11.1 File data seed

| File | Isi |
| --- | --- |
| `data/users.json` | 2 akun demo: `u-free` (Dewi, Free, 5 kredit) dan `u-pro` (Rangga, Pro, 500 kredit) |
| `data/templates.json` | 3 template WhatsApp: Casual, Penawaran Diskon, Profesional |
| `data/mock-leads.json` | 15 prospek seed F&B, olahraga, konveksi, bengkel (telepon `628…`, rating, pitch, `website: null`) |

### 11.2 Modul

- `lib/prototype.ts` — tipe `DemoUser`/`WaTemplate`/`LeadStatus`, persistence, potong/refund kredit,
  upgrade Pro, `fillTemplate()`, `waLink()`, `linkedInXrayUrl()`, `applyFilters()`.
- `lib/mockSearch.ts` — generator prospek deterministik per `"<kata kunci> di <kota>"`; seed lokal dipakai
  lebih dulu, sisanya digenerate (≈28% punya website lalu dibuang, 10% tanpa telepon).
- `components/UserMenu.tsx` — switcher akun + badge paket + sisa kredit + tombol upgrade.
- `components/TemplateModal.tsx` — editor template dengan placeholder `{{business_name}}`,
  `{{city}}`, `{{pitch_angle}}`, `{{catalog_url}}` dan pratinjau langsung.
- `components/ProspectTable.tsx` — status pipeline (warna badge), split-button Kirim WA + dropdown template,
  tombol LinkedIn X-Ray, pagination 20 baris.
- `components/Dashboard.tsx` — 2 tab pencarian, filter rating/ulasan/telepon, stat cards, export CSV.

### 11.3 Perilaku demo

- Setiap klik **Cari Prospek** memotong **1 kredit** akun aktif. Kredit habis → modal "Kuota kredit habis"
  dengan tombol **Upgrade ke Pro (demo)** yang mengisi ulang kuota (tanpa payment gateway).
- Status pipeline disimpan per `placeId` di `localStorage` (`clientfinder:prototype:v1`); snapshot pencarian
  terakhir juga disimpan (`clientfinder:search:v1`) supaya tabel + status tetap ada setelah reload.
- Export CSV mengikuti hasil yang sedang terfilter (termasuk kolom **Status Pipeline**).
- Tombol LinkedIn membuka Google X-Ray `site:linkedin.com/in ("<nama>" OR "<kota>") ("Owner" OR "Founder" OR "Manager")`.
- Di server (`npm run dev` / `npm start`) switch **Live API** memakai `POST /api/search`
  (placeholder `name` → Text Search `"<nama> di <kota>"`); di build statis pilihan itu dinonaktifkan.
