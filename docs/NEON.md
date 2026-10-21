# Deploy Database dengan Neon PostgreSQL

Panduan ini menghubungkan aplikasi Thiz Coffee ke Neon PostgreSQL untuk
production. Database lokal tetap memakai PGlite dan tidak terpengaruh.

## 1. Buat project Neon

1. Masuk ke <https://console.neon.tech> dan buat project baru.
2. Pilih region terdekat dengan pengguna/bisnis, misalnya **Singapore
   (`ap-southeast-1`)**.
3. Simpan nama database (default `neondb`) dan password database.
4. Buka **Connect** dan salin dua connection string:
   - **Pooled connection** — host mengandung `-pooler`, dipakai aplikasi.
   - **Direct connection** — host tanpa `-pooler`, dipakai migration/admin.

Keduanya harus memakai `?sslmode=verify-full`.

Contoh bentuknya (bukan kredensial asli):

```text
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
DATABASE_POOL_MAX=3
```

## 2. Siapkan env lokal untuk migration

Buat file `.env.neon.local` di root project dan isi dengan connection string
Neon. Bentuknya:

```text
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full
DATABASE_POOL_MAX=3
```

File itu sudah di-ignore `.gitignore` (`*.local`) dan tidak boleh di-commit.

Jalankan pengecekan koneksi:

```powershell
node --env-file=.env.neon.local scripts/check-db.mjs
```

Output yang benar menampilkan `Koneksi database: postgres`, nama database, versi
PostgreSQL, dan jumlah tabel. Jika schema belum pernah diterapkan, jumlah tabel
masih `0`; lanjutkan ke langkah berikut.

## 3. Terapkan schema dan buat owner

```powershell
node --env-file=.env.neon.local scripts/migrate.mjs
```

Lalu isi `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `ADMIN_NAME` di
`.env.neon.local`, kemudian buat akun owner:

```powershell
node --env-file=.env.neon.local scripts/create-admin.mjs
```

Atau tanpa mengedit file:

```powershell
$env:ADMIN_EMAIL="owner@example.com"
$env:ADMIN_PASSWORD="password-panjang-dan-acak"
$env:ADMIN_NAME="Owner Thiz Coffee"
node --env-file=.env.neon.local scripts/create-admin.mjs
```

Jangan menjalankan `db:seed` untuk database production. Seed demo hanya untuk
development dan membutuhkan `SEED_DEMO=true` bila production terdeteksi.

> Script migration, seed, reset, dan create-admin otomatis memilih
> `DATABASE_URL_UNPOOLED` lebih dulu. Aplikasi runtime tetap memakai
> `DATABASE_URL` (pooled).

## 4. Set environment di Netlify

Jika Anda memakai integrasi **Netlify Neon / Netlify DB**, Netlify dapat
menyuntikkan `NETLIFY_DB_URL` (integrasi baru) atau `NETLIFY_DATABASE_URL`
(integrasi legacy) secara otomatis. Aplikasi mendeteksi keduanya tanpa perlu
mengganti nama variable. Pastikan scope-nya mencakup **Functions**, karena
panggilan login dan query dashboard berjalan di runtime function.

Jika memakai koneksi manual, buka **Site configuration → Environment variables**
dan tambahkan:

| Variable | Scope | Value |
| --- | --- | --- |
| `DATABASE_URL` | Builds + Functions | Neon **pooled** connection string |
| `DATABASE_URL_UNPOOLED` | Builds | Neon **direct** connection string |
| `DATABASE_POOL_MAX` | Functions | `3` |

Jangan set `PGLITE_DATA_DIR`, `SEED_DEMO`, atau `ADMIN_PASSWORD` di Netlify.
`ADMIN_PASSWORD` hanya dipakai sekali saat bootstrap owner dari mesin lokal.

Gunakan nilai terpisah untuk deploy preview bila preview juga harus memiliki
database. Jangan arahkan preview ke database production.

`netlify.toml` sudah menjalankan:

```text
node scripts/migrate.mjs && npm run build
```

Build Netlify akan memakai `DATABASE_URL_UNPOOLED` otomatis. Runtime server
memakai koneksi pooled dengan batas pool kecil agar sesuai batas koneksi Neon.

## 5. Deploy dan verifikasi

1. Trigger deploy production di Netlify.
2. Pastikan build log menampilkan schema berhasil diterapkan.
3. Buka `/login` dan masuk dengan akun owner yang dibuat pada langkah 3.
4. Cek halaman `/dashboard`, buat satu transaksi uji, lalu batalkan.
5. Pastikan data tetap ada setelah refresh/instance restart.
6. Periksa audit log dan laporan.
7. Buka `/api/health`. Respons yang benar:

```json
{"ok":true,"database":"connected","source":"DATABASE_URL","schemaReady":true,"usersReady":true,"message":"Database connected."}
```

Jika hasilnya `503`, response menunjukkan apakah database belum dikonfigurasi,
tidak bisa dihubungi, atau schema belum dimigrasikan.

Checklist production lengkap ada di [DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

### Login production menampilkan "Terjadi kesalahan pada server"

1. Buka `/api/health`.
2. Jika `database: "unconfigured"`, tambahkan `DATABASE_URL`, atau pastikan
   `NETLIFY_DB_URL` / `NETLIFY_DATABASE_URL` dari integrasi Netlify tersedia untuk
   **Functions**, lalu redeploy.
3. Jika `database: "unreachable"`, periksa connection string dan status compute
   Neon.
4. Jika `schemaReady: false`, jalankan migration.
5. Cek Netlify Function logs; error database sekarang akan tampil dengan kode
   seperti `28P01` (password salah) atau `42P01` (schema belum ada).

### `DATABASE_URL is required in production`

Variable belum terbaca oleh proses. Pastikan scope Netlify mencakup **Functions**
dan **Builds**, lalu redeploy. Aplikasi juga menerima `NETLIFY_DB_URL` dan
`NETLIFY_DATABASE_URL`; cek `/api/health` untuk memastikan nilainya terdeteksi.

### `relation "users" does not exist`

Migration belum berjalan. Jalankan:

```powershell
node --env-file=.env.neon.local scripts/migrate.mjs
```

### `too many connections`

Turunkan `DATABASE_POOL_MAX`, misalnya ke `2`, lalu redeploy. Gunakan pooled
connection untuk runtime, bukan direct connection.

### `password authentication failed`

Salin ulang connection string dari Neon. Jangan mencampur host pooled dengan
password project yang berbeda atau menghilangkan `?sslmode=verify-full`.

Perhatikan host secara persis. Endpoint Neon baru dapat memiliki segmen
komputasi seperti `ep-xxxx.c-2.ap-southeast-1.aws.neon.tech` atau `.c-3`.
Menghilangkan segmen `.c-2`/`.c-3` membuat koneksi menuju endpoint yang salah
dan PostgreSQL menolak dengan kode `28P01` meskipun password benar. Salin
langsung dari tombol **Connect** di Neon Console, jangan mengetik ulang host.

### Koneksi Neon lambat pada request pertama

Neon dapat menidurkan compute saat idle. Request pertama bisa lebih lambat;
ini normal. Gunakan region yang dekat dengan lokasi pengguna dan pertimbangkan
setting compute Neon bila trafik meningkat.

## Keamanan

- Jangan commit `.env.neon.local` atau connection string asli.
- Jangan memakai prefix `NEXT_PUBLIC_` untuk kredensial database.
- Gunakan password unik dan aktifkan rotasi kredensial di Neon.
- Aktifkan backup/PITR Neon sebelum menerima transaksi nyata.
- Hapus akun demo setelah production aktif.
