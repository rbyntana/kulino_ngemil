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
   + CREATE EXPENSE TRANSACTION
======================= */
export async function POST(request: NextRequest) {
  try {
    // ⬇️ Ambil 'date' dari request body
    const { name, unitPrice, quantity, unit, date } = await request.json()

    const totalPrice = Number(unitPrice) * Number(quantity)

    // ⬇️ LOGIKA TANGGAL: Pakai tanggal user, atau fallback ke UTC Now
    let finalDate
    if (date) {
      const dateObj = new Date(date)
      finalDate = new Date(
        Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate()
        )
      )
    } else {
      const now = new Date()
      finalDate = new Date(
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
    }

    const result = await db.$transaction(async (tx) => {
      // 1️⃣ Buat Raw Material (Simpan tanggal yang dipilih)
      const rawMaterial = await tx.rawMaterial.create({
        data: {
          name,
          unitPrice: Number(unitPrice),
          quantity: Number(quantity),
          unit,
          totalPrice,
          date: finalDate // ⬅️ SIMPAN TANGGAL KE RAW MATERIAL
        }
      })

      // 2️⃣ Buat Transaction TERHUBUNG (Gunakan tanggal yang sama)
      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: totalPrice,
          description: `Pembelian bahan baku: ${name}`,
          date: finalDate, // ⬅️ SIMPAN TANGGAL YANG SAMA KE TRANSAKSI (INI YANG TAMPIL)
          rawMaterialId: rawMaterial.id
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
   + UPDATE TRANSACTION
======================= */
export async function PUT(request: NextRequest) {
  try {
    // ⬇️ Ambil 'date' dari request body
    const { id, name, unitPrice, quantity, unit, date } = await request.json()

    const totalPrice = Number(unitPrice) * Number(quantity)

    // ⬇️ LOGIKA TANGGAL: Pakai tanggal user, atau fallback ke UTC Now
    let finalDate
    if (date) {
      const dateObj = new Date(date)
      finalDate = new Date(
        Date.UTC(
          dateObj.getUTCFullYear(),
          dateObj.getUTCMonth(),
          dateObj.getUTCDate()
        )
      )
    } else {
      const now = new Date()
      finalDate = new Date(
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
    }

    const result = await db.$transaction(async (tx) => {
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
          totalPrice,
          date: finalDate // ⬅️ UPDATE TANGGAL DI RAW MATERIAL
        }
      })

      // 3️⃣ Cari Transaction TERKAIT
      const transaction = await tx.transaction.findFirst({
        where: {
          rawMaterialId: id,
          type: 'EXPENSE'
        }
      })

      // 4️⃣ Update Transaction (GANTI JUGA TANGGALNYA)
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            amount: totalPrice,
            description: `Pembelian bahan baku: ${name}`,
            date: finalDate // ⬅️ UPDATE TANGGAL DI TRANSAKSI (INI YANG TAMPIL)
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