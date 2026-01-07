import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyerName, totalAmount, items } = body;

    if (!buyerName || !items || items.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // 1. Validasi Stok dan Kumpulkan Data
    const itemsToProcess = [];

    for (const item of items) {
      const size = await db.size.findUnique({
        where: { id: item.sizeId },
        include: { menu: true }
      });

      if (!size) {
        return NextResponse.json({ error: `Size dengan ID ${item.sizeId} tidak ditemukan` }, { status: 404 });
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
        price: item.price
      });
    }

    // Waktu UTC konsisten
    const now = new Date();
    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));

    // 2. Buat SalesHeader
        // ... (kode sebelumnya sama) ...

    // 2. Buat SalesHeader
    const salesHeader = await db.salesHeader.create({
      data: {
        buyerName: buyerName,
        totalAmount: totalAmount,
        date: utcNow,
        items: {
          create: itemsToProcess.map(item => {
            // Hitung total harga per item (Harga Satuan * Quantity)
            const itemTotal = item.price * item.qty;

            return {
              menuId: item.sizeData.menuId,
              sizeId: item.sizeData.id,
              quantity: item.qty,
              price: item.price,      // Pastikan ini angka
              total: itemTotal        // PENTING: Field ini wajib diisi
            };
          })
        }
      },
      include: { items: true }
    });

    // ... (lanjutkan kode update stok dan transaksi keuangan) ...

    // 3. Update Stok (Berdasarkan itemsToProcess)
    for (const item of itemsToProcess) {
      await db.size.update({
        where: { id: item.sizeData.id },
        data: {
          stock: {
            decrement: item.qty
          }
        }
      });
    }

    // 4. Catat Transaksi Keuangan (Income)
    // Kita buat 1 record income untuk seluruh pembelian
    const itemsDescription = items.map(i => {
      const sizeName = itemsToProcess.find(x => x.sizeData.id === i.sizeId)?.sizeData.size;
      return `${i.menuName} (${sizeName}) x${i.qty}`;
    }).join(', ');

    await db.transaction.create({
      data: {
        type: 'INCOME',
        amount: totalAmount,
        // Ganti deskripsi jadi detail item
        description: itemsDescription, 
        date: utcNow,
        salesHeaderId: salesHeader.id
      }
    });

    return NextResponse.json({ message: 'Transaksi berhasil', data: salesHeader }, { status: 201 });

  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}