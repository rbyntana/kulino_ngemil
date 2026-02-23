import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const rawMaterials = await db.rawMaterial.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(rawMaterials)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, unitPrice, quantity, unit, date } = await request.json()
    const totalPrice = Number(unitPrice) * Number(quantity)

    let finalDate
    if (date) {
      const dateObj = new Date(date)
      finalDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()))
    } else {
      const now = new Date()
      finalDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()))
    }

    const result = await db.$transaction(async (tx) => {
      const rawMaterial = await tx.rawMaterial.create({
        data: { name, unitPrice: Number(unitPrice), quantity: Number(quantity), unit, totalPrice, date: finalDate }
      })
      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: totalPrice,
          description: `Pembelian bahan baku: ${name}`,
          date: finalDate,
          rawMaterialId: rawMaterial.id
        }
      })
      return rawMaterial
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, unitPrice, quantity, unit, date } = await request.json()
    const totalPrice = Number(unitPrice) * Number(quantity)

    let finalDate
    if (date) {
      const dateObj = new Date(date)
      finalDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()))
    } else {
      const now = new Date()
      finalDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()))
    }

    const result = await db.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({ where: { id } })
      if (!material) throw new Error('Raw material not found')

      const updatedMaterial = await tx.rawMaterial.update({
        where: { id },
        data: { name, unitPrice: Number(unitPrice), quantity: Number(quantity), unit, totalPrice, date: finalDate }
      })

      const transaction = await tx.transaction.findFirst({
        where: { rawMaterialId: id, type: 'EXPENSE' }
      })

      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { amount: totalPrice, description: `Pembelian bahan baku: ${name}`, date: finalDate }
        })
      }
      return updatedMaterial
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Failed to update raw material' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    await db.rawMaterial.delete({ where: { id } })
    return NextResponse.json({ message: 'Raw material & transaction deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete raw material' }, { status: 500 })
  }
}