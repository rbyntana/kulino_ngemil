import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper untuk mencari transaksi terakhir
const findLatestExpense = async (name: string) => {
  // Kita cari transaksi expense yang deskripsinya mengandung nama bahan
  return await db.transaction.findFirst({
    where: {
      type: 'EXPENSE',
      description: {
        contains: `Pembelian bahan baku: ${name}` // Sesuaikan pola dengan saat POST
      }
    },
    orderBy: {
      date: 'desc'
    }
  });
};

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

    // 1. Ambil data bahan baku lama (SEBELUM diubah)
    const oldMaterial = await db.rawMaterial.findUnique({
      where: { id }
    });

    if (!oldMaterial) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    const newTotalPrice = (parseFloat(unitPrice) || 0) * (parseFloat(quantity) || 0);

    // 2. Cari dan HAPUS Transaksi Lama
    // Kita cari berdasarkan nama LAMA (oldMaterial.name)
    const oldTransaction = await db.transaction.findFirst({
      where: {
        type: 'EXPENSE',
        description: `Pembelian bahan baku: ${oldMaterial.name}`
      }
    });

    if (oldTransaction) {
      await db.transaction.delete({
        where: { id: oldTransaction.id }
      });
      console.log(`Menghapus riwayat lama untuk: ${oldMaterial.name}`);
    }

    // 3. Update Data Bahan Baku
    const updatedMaterial = await db.rawMaterial.update({
      where: { id },
      data: {
        name,          // Nama baru
        unitPrice: parseFloat(unitPrice),
        quantity: parseFloat(quantity),
        unit,          // Satuan baru
        totalPrice: newTotalPrice
      }
    });

    // 4. Buat Transaksi BARU (Replace)
    // Menggunakan nama BARU (name) dan data terbaru
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
        amount: newTotalPrice,
        description: `Pembelian bahan baku: ${name}`, // Menggunakan nama baru
        date: utcNow
      }
    });
    console.log(`Membuat riwayat baru untuk: ${name}`);

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
