import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    // Query Database
    const header = await db.salesHeader.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menu: true,
            size: true
          }
        }
      }
    });

    if (!header) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(header);

  } catch (error) {
    console.error('Error fetching detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}