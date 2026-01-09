import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Parse date correctly for filter - handle both YYYY-MM-DD and DD/MM/YYYY formats
    const parseDate = (dateStr: string, isEnd: boolean = false) => {
      if (!dateStr) return null;

      let year, month, day;

      // Try to parse YYYY-MM-DD format first
      const yyyyMmDd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (yyyyMmDd) {
        year = parseInt(yyyyMmDd[1]);
        month = parseInt(yyyyMmDd[2]);
        day = parseInt(yyyyMmDd[3]);
      } else {
        // Try to parse DD/MM/YYYY format
        const ddMmYyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddMmYyyy) {
          day = parseInt(ddMmYyyy[1]);
          month = parseInt(ddMmYyyy[2]);
          year = parseInt(ddMmYyyy[3]);
        }
      }

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return null;
      }

      const hour = isEnd ? 23 : 0;
      const minute = isEnd ? 59 : 0;
      const second = isEnd ? 59 : 0;
      const millisecond = isEnd ? 999 : 0;

      // Create Date using UTC directly
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    };

    if (startDate && endDate) {
      const start = parseDate(startDate, false);
      const end = parseDate(endDate, true);

      if (start && end) {
        where.date = {
          gte: start,
          lte: end
        };
      }
    } else if (startDate) {
      const start = parseDate(startDate, false);
      if (start) {
        where.date = {
          gte: start
        };
      }
    } else if (endDate) {
      const end = parseDate(endDate, true);
      if (end) {
        where.date = {
          lte: end
        };
      }
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include : { 
        salesHeader: true 
      }
    });

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get total items sold
    // const salesCount = await db.sale.count();
    // MENJADI:
    const itemsSoldAgg = await db.sale.aggregate({
      _sum: {
        quantity: true
      }
    });
    const totalItemsSold = Math.floor(itemsSoldAgg._sum.quantity || 0);

    return NextResponse.json({
      transactions,
      totalIncome,
      totalExpense,
      totalItemsSold
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/transactions (Tambah pemasukan / pengeluaran manual)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, amount, description, date } = body

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Type dan amount wajib diisi' },
        { status: 400 }
      )
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipe transaksi tidak valid' },
        { status: 400 }
      )
    }

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: Number(amount),
        description: description || '',
        date: date ? new Date(date) : new Date(),
        // ⚠️ salesHeaderId TIDAK DIISI → transaksi manual
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Gagal menambahkan transaksi' },
      { status: 500 }
    )
  }
}

// DELETE transaction
export async function DELETE(request: NextRequest) {
  // Gunakan Transaction agar tidak ada data 'stale' di antara proses
  return await db.$transaction(async (tx) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
      }

      // 1. Ambil Data Transaksi (Pakai tx, bukan db)
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: {
          salesHeader: {
            include: {
              items: true
            }
          }
        }
      });

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

            // 2. Jika ini Transaksi PENJUALAN (Ada SalesHeader)
      if (transaction.salesHeader) {
        // A. Restore Stok
        for (const item of transaction.salesHeader.items) {
          await tx.size.update({
            where: { id: item.sizeId },
            data: { stock: { increment: item.quantity } }
          });
        }

        // B. HAPUS TRANSACTION DULU (Anaknya)
        // Kita hapus record transaction secara eksplisit agar Frontend yakin hilang
        await tx.transaction.delete({
          where: { id }
        });

        // C. HAPUS SALES HEADER (Induknya)
        // Karena SalesHeader sudah tidak punya transaction yang mengunci, dia lebih mudah dihapus
        // Atau karena cascade, mungkin sudah terhapus, tapi kita coba delete aman.
        try {
          await tx.salesHeader.delete({
            where: { id: transaction.salesHeader.id }
          });
        } catch (e) {
          // Abaikan error jika header sudah terhapus karena cascade
        }
        
        return NextResponse.json({ message: 'Transaksi penjualan berhasil dihapus (stok dikembalikan)' });
      } 
      
      // 3. Jika ini Transaksi PENGELUARAN (Ada SaleId)
      else if (transaction.saleId) {
        const oldSale = await tx.sale.findUnique({ where: { id: transaction.saleId } });

        if (oldSale) {
          // Restore Stok
          await tx.size.update({
            where: { id: oldSale.sizeId },
            data: { stock: { increment: oldSale.quantity } }
          });

          // Hapus Sale
          await tx.sale.delete({
            where: { id: oldSale.id }
          });
        }

        // Hapus Transaksi
        await tx.transaction.delete({
          where: { id }
        });

        return NextResponse.json({ message: 'Transaksi pengeluaran berhasil dihapus' });
      }
      
      // 4. Jika ini Pengeluaran Biasa
      else {
        // Hapus Transaksi
        await tx.transaction.delete({
          where: { id }
        });
        return NextResponse.json({ message: 'Transaksi pengeluaran berhasil dihapus' });
      }

    } catch (error) {
      console.error('Error deleting transaction:', error);
      return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }
  });
}

// PUT /api/transactions
export async function PUT(request: NextRequest) {
  return await db.$transaction(async (tx) => {
    try {
      const body = await request.json();
      const { id, type, amount, description, buyerName, items } = body;

      if (!id) throw new Error('ID Transaksi diperlukan');

      // 1. UPDATE PENJUALAN (SALES)
      if (type === 'INCOME' && items) {
        const oldHeader = await tx.salesHeader.findUnique({
          where: { id },
          include: { items: true, transaction: true }
        });

        if (!oldHeader) throw new Error('Transaksi penjualan tidak ditemukan');

        // Validasi Stok
        for (const item of items) {
          const size = await tx.size.findUnique({ where: { id: item.sizeId } });
          const oldItem = oldHeader.items.find(i => i.sizeId === item.sizeId);
          const oldQty = oldItem ? oldItem.quantity : 0;
          if (!size || (size.stock + oldQty) < item.qty) {
            throw new Error(`Stok tidak cukup untuk menu (ID: ${item.sizeId})`);
          }
        }

        // Restore Stok Lama
        for (const oldItem of oldHeader.items) {
          await tx.size.update({ where: { id: oldItem.sizeId }, data: { stock: { increment: oldItem.quantity } } });
        }

        // Hapus Item Lama
        await tx.sale.deleteMany({ where: { headerId: id } });

        // Insert Item Baru
        let newTotalAmount = 0;
        const newItemsData = [];

        for (const item of items) {
          await tx.size.update({ where: { id: item.sizeId }, data: { stock: { decrement: item.qty } } });
          const itemTotal = item.price * item.qty;
          newItemsData.push({
            menuId: item.menuId, sizeId: item.sizeId, quantity: item.qty, price: item.price, total: itemTotal
          });
          newTotalAmount += itemTotal;
        }

        // Update Header
        await tx.salesHeader.update({
          where: { id },
          data: { buyerName, totalAmount: newTotalAmount, items: { create: newItemsData } }
        });

        // Update Transaction Record
        if (oldHeader.transaction) {
          const newDesc = items.map(i => `${i.menuName} (${i.sizeName}) x${i.qty}`).join(', ');
          await tx.transaction.update({
            where: { id: oldHeader.transaction.id },
            data: { amount: newTotalAmount, description: newDesc }
          });
        }
        
        return NextResponse.json({ message: "Sales Updated" });
      } 
      
      // 2. UPDATE PENGELUARAN (EXPENSE) - Ini yang baru!
      else if (type === 'EXPENSE') {
        await tx.transaction.update({
          where: { id },
          data: { amount, description }
        });
        return NextResponse.json({ message: "Expense Updated" });
      }

      throw new Error('Unknown Request Type');
    } catch (error) {
      console.error('Error updating transaction:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Update Failed' }, { status: 500 });
    }
  });
}

