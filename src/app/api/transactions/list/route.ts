import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Ambil parameter page dari URL, default 1
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10; // Batasi 50 data per load

    const skip = (page - 1) * limit;

    const transactions = await db.transaction.findMany({
      skip,
      take: limit,
      orderBy: { date: 'desc' }, // Ambil yang terbaru dulu
      include: {
        salesHeader: {
          select: {
            buyerName: true // Hanya ambil nama pembeli, jangan ambil items details di sini
          }
        }
      }
    });

    // Optional: Kirim juga total data untuk hitung halaman terakhir (jika butuh)
    const totalCount = await db.transaction.count();

    return NextResponse.json({
      data: transactions,
      meta: {
        currentPage: page,
        limit,
        total: totalCount,
        hasMore: (skip + limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching transaction list:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}