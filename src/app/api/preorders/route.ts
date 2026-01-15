import { NextResponse } from 'next/server'
import { prisma as db } from '../../../lib/prisma'

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
    
    // 2. PAKSA tipe data menjadi 'string'
    const preOrder = await db.preOrder.create({
      data: {
        buyerName,
        totalAmount,
        status: 'pending',
        cart: cartString as String 
      }
    })

    return NextResponse.json(preOrder)
  } catch (error) {
    console.error('Error POST PreOrder:', error)
    return NextResponse.json({ error: "Gagal membuat pre-order", details: error.message }, { status: 500 })
  }
}

// 3. PUT: Update Pre-Order (Edit Nama, Item, atau Status)
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, buyerName, items, totalAmount, status } = body

    if (!id) {
      return NextResponse.json({ error: "ID Pre-Order tidak valid" }, { status: 400 })
    }

    // Siapkan data yang akan diupdate
    const dataToUpdate: any = {}

    // Jika ada update status (misal dari client lain)
    if (status) {
      dataToUpdate.status = status
    }

    // Jika ada update dari Frontend (Edit Pre-Order)
    if (buyerName !== undefined) {
      dataToUpdate.buyerName = buyerName
    }

    if (items && totalAmount !== undefined) {
      // Serialize cart kembali ke string JSON
      dataToUpdate.cart = JSON.stringify(items) as String
      dataToUpdate.totalAmount = totalAmount
    }

    // Lakukan update
    const updatedPreOrder = await db.preOrder.update({
      where: { id },
      data: dataToUpdate
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