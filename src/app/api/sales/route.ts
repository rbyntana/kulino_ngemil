import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buyerName, totalAmount, items } = body

    if (!buyerName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    const itemsToProcess: any[] = []

    // 1️⃣ VALIDASI SIZE & STOK
    for (const item of items) {
      const size = await db.size.findUnique({
        where: { id: item.sizeId },
        include: { menu: true },
      })

      if (!size) {
        return NextResponse.json(
          { error: `Size dengan ID ${item.sizeId} tidak ditemukan` },
          { status: 404 }
        )
      }

      if (size.stock < item.qty) {
        return NextResponse.json(
          {
            error: 'STOCK_NOT_ENOUGH',
            menuName: size.menu.name,
            sizeName: size.size,
            remainingStock: size.stock,
          },
          { status: 400 }
        )
      }

      itemsToProcess.push({
        sizeData: size,
        qty: item.qty,
        price: item.price,
      })
    }

    // 2️⃣ WAKTU UTC
    const now = new Date()
    const utcNow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes()
    ))

    // 3️⃣ SALES HEADER + ITEMS
    const salesHeader = await db.salesHeader.create({
      data: {
        buyerName,
        totalAmount,
        date: utcNow,
        items: {
          create: itemsToProcess.map(item => ({
            menuId: item.sizeData.menuId,
            sizeId: item.sizeData.id,
            quantity: item.qty,
            price: item.price,
            total: item.price * item.qty,
          })),
        },
      },
      include: { items: true },
    })

    // 4️⃣ UPDATE STOK
    for (const item of itemsToProcess) {
      await db.size.update({
        where: { id: item.sizeData.id },
        data: {
          stock: { decrement: item.qty },
        },
      })
    }

    // 5️⃣ TRANSAKSI KEUANGAN
    const description = itemsToProcess
      .map(i => `${i.sizeData.menu.name} (${i.sizeData.size}) x${i.qty}`)
      .join(', ')

    await db.transaction.create({
      data: {
        type: 'INCOME',
        amount: totalAmount,
        description,
        date: utcNow,
        salesHeaderId: salesHeader.id,
      },
    })

    return NextResponse.json(
      { message: 'Transaksi berhasil', data: salesHeader },
      { status: 201 }
    )

  } catch (error) {
    console.error('ERROR API SALES:', error)
    return NextResponse.json(
      { error: 'Gagal memproses transaksi' },
      { status: 500 }
    )
  }
}
