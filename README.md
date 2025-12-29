# 📦 Sistem Pendataan & Pembukuan

Sistem pendataan dan pembukuan sederhana untuk mengelola bahan baku, menu, dan transaksi penjualan dengan fitur laporan PDF. Dibuat dengan Next.js 15, TypeScript, Tailwind CSS, dan Prisma.

## ✨ Fitur Utama

### 📦 Bahan Baku (Raw Materials)
- ✅ Pendataan lengkap bahan baku (nama, harga satuan, jumlah, satuan, harga total)
- ✅ Edit data bahan baku dengan update otomatis ke riwayat transaksi
- ✅ Pengeluaran otomatis tercatat saat input bahan baku
- ✅ Hapus data bahan baku

### 🍽️ Menu Management
- ✅ Tambah menu dengan upload gambar (base64)
- ✅ Dukungan multiple ukuran dengan harga masing-masing (misal: 250gr, 500gr)
- ✅ Manajemen stok per ukuran
- ✅ Edit dan hapus menu
- ✅ Tampilan card dengan gambar menu
- ✅ 3 tombol per menu: Jual, Edit, Hapus

### 💰 Penjualan & Transaksi
- ✅ Jual menu dengan pilihan ukuran
- �. Stok otomatis berkurang setelah penjualan
- ✅ Riwayat transaksi pemasukan dan pengeluaran dalam satu tampilan
- ✅ Hapus transaksi dengan pengembalian stok otomatis
- ✅ Dashboard ringkasan (total pemasukan, pengeluaran, item terjual)

### 📊 Laporan PDF
- ✅ Export laporan penjualan ke PDF
- ✅ Filter berdasarkan rentang tanggal (single date atau date range)
- ✅ Laporan mencakup:
  - Ringkasan total pemasukan & pengeluaran
  - Detail transaksi pemasukan
  - Detail transaksi pengeluaran
  - Detail penjualan per menu dan ukuran

### 📱 Responsive Design
- ✅ Tampilan optimal di semua device (mobile, tablet, desktop)
- ✅ UI modern dengan shadcn/ui components
- ✅ Dark/Light mode support

## 🛠️ Technology Stack

- **⚡ Next.js 15** - React framework dengan App Router
- **📘 TypeScript 5** - Type-safe development
- **🎨 Tailwind CSS 4** - Utility-first CSS framework
- **🧩 shadcn/ui** - High-quality UI components
- **🗄️ Prisma ORM** - Database management (SQLite)
- **📄 jsPDF** - PDF generation
- **🎣 React Hook Form** - Form management
- **🔄 TanStack Query** - Data fetching
- **🎭 Sonner** - Toast notifications
- **📅 date-fns** - Date utilities

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun run db:push
bun run db:generate

# Start development server
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat aplikasi.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── raw-materials/    # API untuk bahan baku
│   │   ├── menus/            # API untuk menu
│   │   ├── sales/            # API untuk penjualan
│   │   ├── transactions/     # API untuk transaksi
│   │   └── reports/          # API untuk laporan PDF
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Halaman utama
├── components/
│   └── ui/                   # shadcn/ui components
├── hooks/
│   └── toast.ts              # Toast hook
├── lib/
│   ├── db.ts                 # Prisma client
│   └── utils.ts              # Utility functions
prisma/
└── schema.prisma             # Database schema
```

## 🗄️ Database Schema

### RawMaterial
- Bahan baku dengan tracking harga dan quantity

### Menu
- Menu produk dengan gambar

### Size
- Ukuran menu dengan harga dan stok masing-masing
- Setiap menu bisa memiliki multiple ukuran

### Sale
- Record penjualan dengan detail menu, ukuran, dan quantity
- Stok otomatis terupdate

### Transaction
- Record pemasukan (INCOME) dan pengeluaran (EXPENSE)
- Otomatis dibuat saat penjualan atau pembelian bahan baku
- Bisa dihapus dengan pengembalian stok (untuk penjualan)

## 📖 Panduan Penggunaan

### 1. Menambah Bahan Baku
1. Buka tab "Bahan Baku"
2. Klik "Tambah Bahan Baku"
3. Isi nama, harga satuan, jumlah, dan satuan
4. Harga total akan otomatis dihitung
5. Klik "Simpan"
6. Pengeluaran otomatis tercatat di riwayat transaksi

### 2. Menambah Menu
1. Buka tab "Menu"
2. Klik "Tambah Menu"
3. Upload gambar menu
4. Masukkan nama menu
5. Tambah minimal satu ukuran dengan harga dan stok
6. Bisa tambah lebih banyak ukuran dengan klik "Tambah Ukuran"
7. Klik "Simpan"

### 3. Menjual Menu
1. Buka tab "Menu"
2. Cari menu yang akan dijual
3. Klik tombol "Jual"
4. Pilih ukuran yang tersedia
5. Masukkan jumlah yang akan dijual
6. Klik "Konfirmasi Penjualan"
7. Stok otomatis berkurang dan pemasukan tercatat

### 4. Melihat Riwayat Transaksi
1. Buka tab "Transaksi"
2. Lihat ringkasan pemasukan, pengeluaran, dan item terjual
3. Scroll untuk melihat semua transaksi
4. Hapus transaksi yang tidak diperlukan
5. Untuk transaksi penjualan, stok akan dikembalikan otomatis

### 5. Export Laporan PDF
1. Buka tab "Laporan"
2. Pilih tanggal mulai dan/atau tanggal akhir (opsional)
3. Klik "Export PDF"
4. Laporan akan otomatis diunduh berisi:
   - Ringkasan pemasukan & pengeluaran
   - Detail semua transaksi dalam periode
   - Detail penjualan per menu dan ukuran

## 🚀 Deployment ke Vercel

### 1. Persiapan
```bash
# Pastikan semua changes sudah committed
git add .
git commit -m "Initial commit"

# Push ke GitHub
git push origin main
```

### 2. Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com)
2. Klik "New Project"
3. Import repository dari GitHub
4. Konfigurasi build settings (otomatis terdeteksi)
5. Klik "Deploy"

### 3. Environment Variables
Tidak perlu setup environment variables khusus untuk database karena menggunakan SQLite lokal.

### 4. Note untuk Production
- Database SQLite tidak cocok untuk scaling horizontal
- Untuk production dengan traffic tinggi, pertimbangkan upgrade ke PostgreSQL
- Untuk SQLite di Vercel Serverless, database akan di-reset setiap deployment

## 🔧 Commands

```bash
# Development
bun run dev          # Start development server
bun run lint         # Check code quality

# Database
bun run db:push      # Push schema to database
bun run db:generate  # Generate Prisma client

# Production
bun run build        # Build for production
bun start             # Start production server
```

## 📝 Catatan Penting

### Database
- Menggunakan SQLite untuk kemudahan deployment
- Database disimpan di file `db/custom.db`
- Data akan persist selama file database tidak dihapus

### Gambar Menu
- Gambar disimpan sebagai base64 string di database
- Tidak perlu storage service tambahan
- Sebaiknya gunakan gambar dengan ukuran yang wajar (< 500KB)

### Transaksi
- Setiap transaksi bisa dihapus
- Penghapusan transaksi penjualan akan mengembalikan stok
- Penghapusan transaksi bahan baku akan menghapus record tapi stok bahan baku tetap

### Laporan PDF
- Laporan dibuat server-side
- Tidak perlu library PDF di client side
- Format PDF standar yang kompatibel dengan semua PDF reader

## 🤝 Contributing

Jika ingin menambah fitur atau mengubah aplikasi:
1. Fork repository
2. Buat branch baru untuk fitur
3. Commit perubahan
4. Push dan buat Pull Request

## 📄 License

Project ini dibuat untuk keperluan bisnis dan dapat digunakan secara bebas.

---

Dibuat dengan ❤️ untuk kemudahan manajemen bisnis. Powered by [Z.ai](https://chat.z.ai) 🚀
