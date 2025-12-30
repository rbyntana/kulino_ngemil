import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Hapus semua tabel (Drop semua)
    // Kita menggunakan raw query atau delete many
    await db.sale.deleteMany({});
    await db.salesHeader.deleteMany({});
    await db.rawMaterial.deleteMany({});
    await db.menuItem.deleteMany({});
    await db.menu.deleteMany({});
    await db.size.deleteMany({});
    await db.transaction.deleteMany({});

    return NextResponse.json({ message: 'Database berhasil di-reset' });
  } catch (error) {
    console.error('Reset Error:', error);
    return NextResponse.json({ error: 'Gagal reset database' }, { status: 500 });
  }
}