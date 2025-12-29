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
      orderBy: { date: 'desc' }
    });

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get total items sold
    const salesCount = await db.sale.count();

    return NextResponse.json({
      transactions,
      totalIncome,
      totalExpense,
      salesCount
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// DELETE transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if transaction is linked to a sale
    const transaction = await db.transaction.findUnique({
      where: { id },
      include: { sale: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If linked to a sale, restore the stock
    if (transaction.sale) {
      await db.size.update({
        where: { id: transaction.sale.sizeId },
        data: {
          stock: {
            increment: transaction.sale.quantity
          }
        }
      });

      // Delete the sale
      await db.sale.delete({
        where: { id: transaction.sale.id }
      });
    }

    // Delete the transaction
    await db.transaction.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
