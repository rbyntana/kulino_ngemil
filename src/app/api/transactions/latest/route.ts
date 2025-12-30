import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialName = searchParams.get('name');

    if (!materialName) {
      return NextResponse.json({ error: 'Nama bahan baku diperlukan' }, { status: 400 });
    }

    // Cari transaksi pengeluaran yang description-nya mengandung nama bahan baku
    // Urutkan dari yang terbaru, ambil 1
    const transaction = await db.transaction.findFirst({
      where: {
        type: 'EXPENSE',
        description: {
          contains: `Beli ${materialName}`
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(transaction || null);
  } catch (error) {
    console.error('Error fetching latest transaction:', error);
    return NextResponse.json({ error: 'Gagal mengambil data transaksi' }, { status: 500 });
  }
}