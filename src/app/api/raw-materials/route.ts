import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* =======================
   GET ALL RAW MATERIALS
======================= */
export async function GET() {
  try {
    const rawMaterials = await db.rawMaterial.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(rawMaterials)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    )
  }
}

/* =======================
   POST RAW MATERIAL
   + CREATE EXPENSE TRANSACTION (TERHUBUNG)
======================= */
export async function POST(request: NextRequest) {
  try {
    const { name, unitPrice, quantity, unit } = await request.json()

    const totalPrice = Number(unitPrice) * Number(quantity)

    const now = new Date()
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      )
    )

    const result = await db.$transaction(async (tx) => {
      // 1️⃣ Buat Raw Material
      const rawMaterial = await tx.rawMaterial.create({
        data: {
          name,
          unitPrice: Number(unitPrice),
          quantity: Number(quantity),
          unit,
          totalPrice
        }
      })

      // 2️⃣ Buat Transaction TERHUBUNG
      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: totalPrice,
          description: `Pembelian bahan baku: ${name}`,
          date: utcNow,
          rawMaterialId: rawMaterial.id // 🔥 KUNCI
        }
      })

      return rawMaterial
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to create raw material' },
      { status: 500 }
    )
  }
}

/* =======================
   PUT RAW MATERIAL
   + UPDATE TRANSACTION (BUKAN DELETE)
======================= */
export async function PUT(request: NextRequest) {
  try {
    const { id, name, unitPrice, quantity, unit } = await request.json()

    const totalPrice = Number(unitPrice) * Number(quantity)

    const now = new Date()
    const utcNow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
      )
    )

    const result = await db.$transaction(async (tx) => {
      // 1️⃣ Pastikan bahan baku ada
      const material = await tx.rawMaterial.findUnique({
        where: { id }
      })

      if (!material) {
        throw new Error('Raw material not found')
      }

      // 2️⃣ Update Raw Material
      const updatedMaterial = await tx.rawMaterial.update({
        where: { id },
        data: {
          name,
          unitPrice: Number(unitPrice),
          quantity: Number(quantity),
          unit,
          totalPrice
        }
      })

      // 3️⃣ Cari Transaction TERKAIT
      const transaction = await tx.transaction.findFirst({
        where: {
          rawMaterialId: id,
          type: 'EXPENSE'
        }
      })

      // 4️⃣ Update Transaction (JANGAN DELETE)
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            amount: totalPrice,
            description: `Pembelian bahan baku: ${name}`,
            date: utcNow
          }
        })
      }

      return updatedMaterial
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json(
      { error: error.message || 'Failed to update raw material' },
      { status: 500 }
    )
  }
}

/* =======================
   DELETE RAW MATERIAL
   (TRANSACTION AUTO TERHAPUS VIA CASCADE)
======================= */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.rawMaterial.delete({
      where: { id }
    })
    // 🔥 Transaction TERKAIT AUTO TERHAPUS (onDelete: Cascade)

    return NextResponse.json({
      message: 'Raw material & transaction deleted successfully'
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to delete raw material' },
      { status: 500 }
    )
  }
}
