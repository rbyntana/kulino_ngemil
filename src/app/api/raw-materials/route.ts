import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all raw materials
export async function GET() {
  try {
    const rawMaterials = await db.rawMaterial.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(rawMaterials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 });
  }
}

// POST create raw material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unitPrice, quantity, unit } = body;

    const totalPrice = unitPrice * quantity;

    // Get current time in UTC without timezone issues
    const now = new Date();
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
    );

    console.log('=== SAVING RAW MATERIAL ===');
    console.log('Local time:', now.toISOString());
    console.log('UTC time:', utcNow.toISOString());
    console.log('Name:', name);
    console.log('Total Price:', totalPrice);

    const rawMaterial = await db.rawMaterial.create({
      data: {
        name,
        unitPrice: parseFloat(unitPrice),
        quantity: parseFloat(quantity),
        unit,
        totalPrice
      }
    });

    // Create expense transaction with UTC date
    const transaction = await db.transaction.create({
      data: {
        type: 'EXPENSE',
        amount: totalPrice,
        description: `Pembelian bahan baku: ${name}`,
        date: utcNow  // Store as UTC
      }
    });

    console.log('Created transaction with date:', transaction.date);

    return NextResponse.json(rawMaterial, { status: 201 });
  } catch (error) {
    console.error('Error creating raw material:', error);
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 });
  }
}

// PUT update raw material
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, unitPrice, quantity, unit } = body;

    const existingMaterial = await db.rawMaterial.findUnique({
      where: { id }
    });

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    const newTotalPrice = unitPrice * quantity;

    // Update raw material
    const updatedMaterial = await db.rawMaterial.update({
      where: { id },
      data: {
        name,
        unitPrice: parseFloat(unitPrice),
        quantity: parseFloat(quantity),
        unit,
        totalPrice: newTotalPrice
      }
    });

    // Create new transaction for difference with UTC date
    const priceDifference = newTotalPrice - existingMaterial.totalPrice;
    if (priceDifference !== 0) {
      const now = new Date();
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
      );

      await db.transaction.create({
        data: {
          type: 'EXPENSE',
          amount: priceDifference,
          description: `Update bahan baku: ${name} (${priceDifference > 0 ? '+' : ''}${priceDifference})`,
          date: utcNow  // Store as UTC
        }
      });
    }

    return NextResponse.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating raw material:', error);
    return NextResponse.json({ error: 'Failed to update raw material' }, { status: 500 });
  }
}

// DELETE raw material
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const material = await db.rawMaterial.findUnique({
      where: { id }
    });

    if (!material) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    await db.rawMaterial.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Raw material deleted successfully' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    return NextResponse.json({ error: 'Failed to delete raw material' }, { status: 500 });
  }
}
