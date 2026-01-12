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
    include: {
      salesHeader: {
        include: {
          items: {
            include: {
              menu: true,
              size: true
            }
          }
        }
      }
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
        isManual: true,
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
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi tidak valid" },
        { status: 400 }
      )
    }

    // Ambil transaksi untuk validasi
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        salesHeader: true,
        rawMaterial: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      )
    }

    // 🔥 SATU BARIS PALING AMAN
    // Cascade akan mengurus:
    // - INCOME → SalesHeader → Sale
    // - EXPENSE → RawMaterial
    await db.transaction.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil dihapus",
    })
  } catch (error) {
    console.error("DELETE TRANSACTION ERROR:", error)
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 }
    )
  }
}

// PUT /api/transactions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Jika body punya id transaksi manual
    if (body.id && !body.salesHeaderId) {
      const { id, type, amount, description, date } = body

      const existing = await db.transaction.findUnique({ where: { id } })
      if (!existing) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
      if (!existing.isManual) return NextResponse.json({ error: 'Tidak bisa edit transaksi sistem' }, { status: 403 })

      const updated = await db.transaction.update({
        where: { id },
        data: {
          type,
          amount: Number(amount),
          description,
          date: new Date(date)
        }
      })

      return NextResponse.json(updated)
    }

    // ✅ Jika body punya salesHeaderId → update transaksi penjualan
    if (body.salesHeaderId && Array.isArray(body.items)) {
      const { salesHeaderId, buyerName, items } = body

      await db.$transaction(async (tx) => {
        // Ambil data lama
        const oldItems = await tx.sale.findMany({ where: { headerId: salesHeaderId } })

        // Kembalikan stok lama
        for (const old of oldItems) {
          await tx.size.update({
            where: { id: old.sizeId },
            data: { stock: { increment: old.quantity } }
          })
        }

        // Validasi stok baru
        for (const item of items) {
          const size = await tx.size.findUnique({ where: { id: item.sizeId } })
          if (!size || size.stock < item.qty) throw new Error(`Stok tidak cukup (${item.sizeName})`)
        }

        // Kurangi stok baru
        for (const item of items) {
          await tx.size.update({
            where: { id: item.sizeId },
            data: { stock: { decrement: item.qty } }
          })
        }

        // Update Header
        const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0)
        const header = await tx.salesHeader.update({
          where: { id: salesHeaderId },
          data: { buyerName, totalAmount },
          include: { transaction: true }
        })

        // Update Transaction (uang + deskripsi)
        const description = items.map(i => `${i.menuName} (${i.sizeName}) x${i.qty}`).join(', ')
        await tx.transaction.update({
          where: { id: header.transaction!.id },
          data: { amount: totalAmount, description }
        })

        // Replace items
        await tx.sale.deleteMany({ where: { headerId: salesHeaderId } })
        await tx.sale.createMany({
          data: items.map(i => ({
            headerId: salesHeaderId,
            menuId: i.menuId,
            sizeId: i.sizeId,
            quantity: i.qty,
            price: i.price,
            total: i.price * i.qty
          }))
        })
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

