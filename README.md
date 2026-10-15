# ThriftLoop

Website katalog thrift + sistem manajemen toko (React + Vite + Supabase).

## Fitur MVP

**Publik**
- Beranda, katalog (cari/filter/urut/pagination), detail produk, tentang toko
- Tanpa keranjang / checkout online

**Internal (`/admin`)**
- Login staf (Supabase Auth)
- Dashboard statistik
- Manajemen produk & kategori + upload foto
- Inventaris (restok, penyesuaian, riwayat stok)
- Kasir/POS (tunai, transfer, QRIS + diskon)
- Riwayat penjualan + void (admin)
- Laporan + ekspor CSV
- Manajemen peran pengguna

## Stack

- React 19 + Vite + React Router
- Tailwind CSS v4
- Supabase (Postgres, Auth, Storage, RLS, RPC)
- Cloudflare Pages (SPA `_redirects`)

## Setup lokal

1. Salin environment:

```bash
cp .env.example .env.local
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari Supabase Project Settings → API.

2. Install & jalankan:

```bash
npm install
npm run dev
```

3. Setup database di Supabase SQL Editor — jalankan berurutan:

- `supabase/migrations/001_schema.sql`
- `supabase/migrations/002_rls_helpers.sql`
- `supabase/migrations/003a_rpc_inventory.sql`
- `supabase/migrations/003b_rpc_sale.sql`
- `supabase/migrations/003c_rpc_void.sql`
- `supabase/migrations/004a_reports.sql`
- `supabase/migrations/004b_reports_storage.sql`

4. Buat user staf di **Authentication → Users**, lalu jadikan admin:

Edit email di `supabase/bootstrap_admin.sql` lalu jalankan.

## Keputusan MVP (dari PRD §15)

| Topik | Keputusan |
|---|---|
| HPP | Snapshot `cost_price` produk saat penjualan |
| Pembayaran | Tunai, Transfer, QRIS |
| Diskon | Kasir boleh memberi diskon transaksi |
| Struk | Tampilan di layar setelah transaksi |
| Peran | `admin` dan `cashier` |
| Brand | ThriftLoop |

## Deploy Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

File `public/_redirects` sudah disiapkan untuk SPA routing.

## Struktur penting

```
src/
  components/   # layout, UI, produk, auth
  context/      # AuthContext
  pages/        # public + admin
  services/     # akses Supabase
  lib/          # client, format, constants
supabase/migrations/
```

## Keamanan

- RLS aktif di semua tabel utama
- Katalog publik tidak mengekspos `cost_price` ke role `anon`
- Penjualan / restok / void / laporan lewat RPC `security definer` dengan cek role
- Jangan pernah menaruh service-role key di frontend
