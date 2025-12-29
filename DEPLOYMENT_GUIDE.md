# Panduan Deployment ke Vercel dengan Supabase

## 📋 Langkah-langkah Deployment

### 1. Persiapan Code & Repository

#### A. Buat Repository GitHub
```bash
# Initialize git jika belum
git init

# Add semua file
git add .

# Commit pertama
git commit -m "Initial commit"

# Buat repository baru di GitHub.com
# Copy URL repository (contoh: https://github.com/username/my-project.git)

# Connect ke remote repository
git remote add origin https://github.com/username/my-project.git

# Push code
git branch -M main
git push -u origin main
```

#### B. Update File `.gitignore`
Buat atau update file `.gitignore` di root project:

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local
.env.production

# vercel
.vercel

# database
*.db
*.sqlite
*.sqlite-journal
```

### 2. Setup Supabase

#### A. Create Project di Supabase
1. Buka [https://supabase.com](https://supabase.com)
2. Sign up atau login
3. Klik "New Project"
4. Isi project details:
   - Name: `my-inventory-system`
   - Database Password: Buat password yang kuat dan SIMPAN!
   - Region: Singapore (atau yang paling dekat dengan user)
5. Klik "Create new project"

#### B. Get Database Credentials
1. Setelah project dibuat, buka project
2. Masuk ke menu **Settings** → **Database**
3. Copy informasi berikut:
   - **Connection string** (format: `postgres://[user]:[password]@[host]:[port]/[database]`)
   - **Database URL** (format: `postgresql://[user]:[password]@[host]:[port]/[database]`)

**⚠️ PENTING:** Simpan database URL dan jangan bagikan ke publik!

### 3. Update Prisma Schema untuk PostgreSQL

#### A. Install Prisma CLI (jika belum)
```bash
npx prisma@latest init
```

#### B. Update `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model RawMaterial {
  id          String      @id @default(cuid())
  name        String
  unitPrice   Float
  quantity    Float
  unit        String
  totalPrice  Float
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("raw_materials")
}

model Size {
  id          String      @id @default(cuid())
  size        String
  price       Float
  stock       Int
  menuId      String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  menu        Menu        @relation(fields: [menuId], references: [id], onDelete: Cascade)
}

model Sale {
  id          String      @id @default(cuid())
  menuId      String
  sizeId      String
  quantity    Int
  price       Float
  total       Float
  date        DateTime    @default(now())
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  size        Size        @relation(fields: [sizeId], references: [id], onDelete: Cascade)
  menu        Menu        @relation(fields: [menuId], references: [id], onDelete: Cascade)
  transaction Transaction?
}

model Transaction {
  id          String      @id @default(cuid())
  type        TransactionType
  amount      Float
  description String
  date        DateTime    @default(now())
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  saleId      String?
  sale        Sale?       @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@map("transactions")
}

model Menu {
  id          String      @id @default(cuid())
  name        String
  image       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  sizes       Size[]
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

#### C. Create Migration
```bash
# Generate migration
npx prisma migrate dev --name init_postgresql

# Atau gunakan Prisma Studio untuk generate migration dari schema
npx prisma db push
```

### 4. Update Environment Variables

#### A. Buat `.env.local` untuk development

```env
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
```

#### B. Install Dependencies Tambahan untuk PostgreSQL

```bash
npm install @prisma/client @prisma/adapter-postgresql
# atau
bun install @prisma/client @prisma/adapter-postgresql
```

#### C. Update `lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client'

// Untuk development dengan SQLite
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.DATABASE_URL?.startsWith('postgresql')) {
  // PostgreSQL (Supabase)
  prisma = new PrismaClient()
} else {
  // SQLite (development)
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  prisma = globalForPrisma.prisma
}

export const db = prisma
```

### 5. Deployment ke Vercel

#### A. Install Vercel CLI (opsional)
```bash
npm i -g vercel
# atau
bun install -g vercel
```

#### B. Deploy melalui Vercel Dashboard
1. Buka [https://vercel.com](https://vercel.com)
2. Sign up atau login dengan GitHub
3. Klik **"Add New..."** → **"Project"**
4. Pilih **"Import Git Repository"**
5. Pilih repository `my-project` dari GitHub
6. Configure project:
   - **Project Name**: `my-inventory-system` (atau nama lain)
   - **Framework Preset**: Next.js (auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` atau `bun run build`
   - **Output Directory**: `.next` (default)
7. Klik **"Deploy"**

#### C. Setup Environment Variables di Vercel

Sebelum atau setelah deployment, setup environment variables:

1. Buka project di Vercel Dashboard
2. Masuk ke tab **Settings** → **Environment Variables**
3. Tambah variables berikut:

| Name | Value | Environment |
|------|-------|------------|
| `DATABASE_URL` | `postgresql://[user]:[password]@[host]:[port]/[database]` | Production, Preview, Development |

**Catatan:**
- Ganti `[user]:[password]@[host]:[port]/[database]` dengan connection string dari Supabase
- Pastikan checkbox **"Include in Preview/Development Environments"** di-centang untuk preview

#### D. Re-deploy Setelah Setup Environment Variables

1. Di Vercel Dashboard, masuk ke tab **Deployments**
2. Klik titik tiga (⋮) di deployment terakhir
3. Pilih **"Redeploy"**

### 6. Setup Supabase Tables (Opsional)

Jika ingin melihat tables langsung di Supabase:

1. Buka Supabase Dashboard
2. Masuk ke menu **Table Editor**
3. Tables akan otomatis dibuat setelah Prisma migration
4. Bisa insert data langsung untuk testing

### 7. Troubleshooting Deployment

#### Masalah 1: Database Connection Error
```
Error: Can't reach database server
```
**Solusi:**
- Cek DATABASE_URL di Vercel
- Pastikan connection string benar
- Cek project di Supabase masih active

#### Masalah 2: Build Error
```
Error: Module not found: @prisma/client
```
**Solusi:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Generate Prisma Client
npx prisma generate
```

#### Masalah 3: Environment Variables Not Working
**Solusi:**
- Redeploy setelah menambah environment variables
- Pastikan nama environment variable benar (case-sensitive)

#### Masalah 4: Migration Issues
**Solusi:**
```bash
# Reset dan jalankan migration lagi
npx prisma migrate resolve --applied "20250101000000_init_postgresql"
npx prisma migrate dev --name init_postgresql

# atau gunakan push
npx prisma db push
```

### 8. Testing di Production

Setelah deployment berhasil:

1. Buka URL production dari Vercel
2. Test semua fitur:
   - Tambah bahan baku
   - Tambah menu
   - Jual menu
   - Hapus transaksi
   - Buat laporan
3. Cek console browser (F12) untuk error
4. Cek Vercel logs di Dashboard

### 9. Monitoring & Maintenance

#### A. Cek Vercel Logs
1. Buka Vercel Dashboard
2. Pilih project
3. Tab **Logs** → lihat error logs
4. Tab **Functions** → lihat function logs

#### B. Cek Supabase Monitoring
1. Buka Supabase Dashboard
2. Tab **Database** → lihat connection stats
3. Tab **Logs** → lihat query logs
4. Tab **Settings** → cek billing dan limits

### 10. Backup & Restore

#### Backup Database
```bash
# Dump PostgreSQL database
pg_dump postgresql://[user]:[password]@[host]:[port]/[database] > backup.sql

# Atau gunakan Supabase CLI
supabase db dump -f backup.sql
```

#### Restore Database
```bash
# Restore dari backup
psql postgresql://[user]:[password]@[host]:[port]/[database] < backup.sql

# Atau gunakan Supabase CLI
supabase db restore -f backup.sql
```

### 11. Security Checklist

- [ ] DATABASE_URL tidak di-commit ke git
- [ ] Password database kuat dan disimpan di tempat aman
- [ ] Enable SSL di database
- [ ] Environment variables hanya di production
- [ ] Rate limiting diimplementasikan
- [ ] Authentication ditambahkan (untuk multi-user)
- [ ] Input validation di sisi client dan server
- [ ] SQL injection protection (Prisma sudah mencegah)

### 12. Resources & Documentation

#### Vercel Docs
- https://vercel.com/docs
- https://vercel.com/guides/deploying-with-nextjs

#### Supabase Docs
- https://supabase.com/docs/guides/platform/local-development
- https://supabase.com/docs/guides/database/connecting-to-postgres

#### Prisma Docs
- https://www.prisma.io/docs
- https://www.prisma.io/docs/concepts/components/prisma-schema

#### Next.js Deployment Docs
- https://nextjs.org/docs/deployment

### 13. Arsitektur Production

```
┌─────────────────┐
│   Vercel CDN   │
├─────────────────┤
│   Next.js App   │
├─────────────────┤
│  Supabase DB    │
└─────────────────┘
```

**Flow:**
1. User → Vercel URL
2. Vercel → Serves Next.js app
3. Next.js → API Routes
4. API Routes → Prisma Client
5. Prisma → Supabase PostgreSQL
6. Supabase → Execute queries
7. Supabase → Return results
8. Results → API → User

### 14. Cost Estimation

#### Vercel (Hobby Plan)
- **Free**: 100GB bandwidth, 6 deployments, unlimited projects
- **Pro**: $20/bulan - 1TB bandwidth, 10x faster builds
- **Untuk project ini**: Free plan biasanya cukup

#### Supabase (Free Plan)
- **Database**: 500MB storage, 1GB bandwidth
- **API**: 50,000 MAU (Monthly Active Users)
- **Connections**: 60 concurrent
- **Untuk project ini**: Free plan bisa mulai

**Total Cost**: $0/bulan (dengan free plans) 🎉

### 15. Quick Start Commands

```bash
# 1. Install dependencies untuk PostgreSQL
npm install @prisma/client @prisma/adapter-postgresql
bun install @prisma/client @prisma/adapter-postgresql

# 2. Update Prisma schema
# Edit prisma/schema.prisma ganti provider ke postgresql

# 3. Generate Prisma Client
npx prisma generate

# 4. Push schema ke Supabase
npx prisma db push

# 5. Test database connection
npx prisma studio

# 6. Deploy ke Vercel
vercel --prod

# atau deploy via dashboard
```

### 16. Best Practices

1. **Environment Management**
   - Gunakan `.env.local` untuk development
   - Gunakan `.env.production` untuk production
   - Jangan commit `.env` file ke git
   - Add `.env` ke `.gitignore`

2. **Database Management**
   - Gunakan migrations, jangan manual edit
   - Backup sebelum major changes
   - Test migration di staging dulu
   - Gunakan Prisma Studio untuk inspect data

3. **Deployment**
   - Deploy ke preview environment dulu
   - Test thoroughly sebelum production
   - Rollback strategy siap jika ada issue
   - Monitor logs setelah deployment

4. **Code Quality**
   - Linting: `npm run lint`
   - Type checking: `npx tsc --noEmit`
   - Run tests sebelum deploy (jika ada)

5. **Performance**
   - Enable caching di Vercel
   - Optimize images
   - Use Next.js Image Optimization
   - Lazy load components

### 17. FAQ

**Q: Apakah bisa menggunakan Supabase free untuk production?**
A: Ya, untuk project dengan traffic rendah-moderate. Monitor storage dan bandwidth.

**Q: Bagaimana cara update schema?**
A: Edit `prisma/schema.prisma`, run `npx prisma db push` untuk development, atau create migration untuk production.

**Q: Bagaimana cara seed initial data?**
A: Create `prisma/seed.ts` file, run `npx prisma db seed`.

**Q: Bagaimana cara backup data dari SQLite sebelum pindah?**
A: Export SQLite data via Prisma Studio atau custom script, then transform to PostgreSQL format and import.

**Q: Apakah Vercel gratis selamanya?**
A: Ada limits (bandwidth, build time, etc.), tapi untuk project kecil biasanya cukup.

**Q: Bagaimana cara handle database seiring pertumbuhan project?**
A: Monitor storage di Supabase, upgrade plan jika diperlukan, implement data archiving untuk data lama.
