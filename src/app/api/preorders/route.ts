import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 1. GET: Ambil semua Pre-Order
export async function GET() {
  try {
    const preOrders = await db.preOrder.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(preOrders)
  } catch (error) {
    console.error('Error GET PreOrders:', error)
    return NextResponse.json({ error: "Gagal mengambil pre-order" }, { status: 500 })
  }
}

// 2. POST: Simpan Pre-Order Baru
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { buyerName, totalAmount, items } = body

    if (!buyerName || !items) {
      return NextResponse.json({ error: "Data tidak lengkap (nama atau items)" }, { status: 400 })
    }

    // 1. Ubah cart menjadi String JSON
    const cartString = JSON.stringify(items)
    
    // 2. PAKSA tipe data menjadi 'string' (Tidak boleh JSON)
    const preOrder = await db.preOrder.create({
      data: {
        buyerName,
        totalAmount,
        status: 'pending',
        cart: cartString as String // <--- WAJIB 'as String'
      }
    })

    return NextResponse.json(preOrder)
  } catch (error) {
    console.error('Error POST PreOrder:', error)
    return NextResponse.json({ error: "Gagal membuat pre-order", details: error.message }, { status: 500 })
  }
}

// 3. PUT: Update Status Pre-Order
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "ID atau Status tidak valid" }, { status: 400 })
    }

    const updatedPreOrder = await db.preOrder.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json(updatedPreOrder)
  } catch (error) {
    console.error('Error PUT PreOrder:', error)
    return NextResponse.json({ error: "Gagal update pre-order" }, { status: 500 })
  }
}

// 4. DELETE: Hapus Pre-Order
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 })
    }

    await db.preOrder.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error DELETE PreOrder:', error)
    return NextResponse.json({ error: "Gagal menghapus pre-order" }, { status: 500 })
  }
}