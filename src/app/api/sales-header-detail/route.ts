import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { da } from 'date-fns/locale'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }

    const header = await db.salesHeader.findUnique({
      where: { id },
      include: {
        transaction: true,
        items: {
          include: {
            size: true,
            menu: {
              include: {
                sizes: true // ✅ WAJIB
              }
            }
          }
        }
      }
    })

    console.log('SALES HEADER FROM DB:', header)
    if (!header) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      id: header.id,                     // salesHeaderId
      transactionId: header.transactionId, // transactionId
      date: header.transaction.date,
      buyerName: header.buyerName,        // ✅ INI YANG HILANG
      amount: header.transaction.amount,
      items: header.items
    })

  } catch (error) {
    console.error('Error fetching detail:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
