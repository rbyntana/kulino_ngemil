import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20; // Bahan baku cukup 20 per halaman
    const skip = (page - 1) * limit;

    const rawMaterials = await db.rawMaterial.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const totalCount = await db.rawMaterial.count();

    return NextResponse.json({
      data: rawMaterials,
      meta: {
        currentPage: page,
        limit,
        total: totalCount,
        hasMore: (skip + limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching raw materials list:', error);
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 });
  }
}