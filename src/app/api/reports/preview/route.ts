import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
        console.error('Invalid date string:', dateStr);
        return null;
      }

      const hour = isEnd ? 23 : 0;
      const minute = isEnd ? 59 : 0;
      const second = isEnd ? 59 : 0;
      const millisecond = isEnd ? 999 : 0;

      // Create Date using UTC directly
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    };

    // DEBUG: Log input dates
    console.log('=== DEBUG REPORT API ===');
    console.log('Raw startDate:', startDate);
    console.log('Raw endDate:', endDate);

    // Format input dates for display (what user selected)
    const formatInputDate = (dateStr: string | null) => {
      if (!dateStr) return null;
      // Input is YYYY-MM-DD, convert to DD/MM/YYYY
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const displayStartDate = formatInputDate(startDate);
    const displayEndDate = formatInputDate(endDate);
    console.log('Display startDate (user selected):', displayStartDate);
    console.log('Display endDate (user selected):', displayEndDate);

    const parsedStart = parseDate(startDate || '', false);
    const parsedEnd = parseDate(endDate || '', true);
    console.log('Parsed start for filtering:', parsedStart?.toISOString());
    console.log('Parsed end for filtering:', parsedEnd?.toISOString());

    // Only set where clause if dates are valid
    if (parsedStart && parsedEnd) {
      where.date = {
        gte: parsedStart,
        lte: parsedEnd
      };
    } else if (parsedStart) {
      where.date = {
        gte: parsedStart
      };
    } else if (parsedEnd) {
      where.date = {
        lte: parsedEnd
      };
    }

    console.log('Final where clause:', where);

    // Get transactions
    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    // Get sales with proper date filter
    const sales = await db.sale.findMany({
      where: {
        date: where.date
      },
      include: {
        menu: true,
        size: true
      },
      orderBy: { date: 'desc' }
    });

    console.log('Transactions found:', transactions.length);
    console.log('Sales found:', sales.length);

    // Calculate totals
    const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0);

    // Format dates for display as DD/MM/YYYY - split input string directly
    const formatDateRange = (dateStr: string | null) => {
      if (!dateStr) return null;

      // Input is always YYYY-MM-DD format, just split and rearrange
      const parts = dateStr.split('-');
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];

      return `${day}/${month}/${year}`;
    };

    const formattedStartDate = formatDateRange(startDate);
    const formattedEndDate = formatDateRange(endDate);

    console.log('Formatted startDate:', formattedStartDate);
    console.log('Formatted endDate:', formattedEndDate);

    return NextResponse.json({
      transactions,
      sales,
      totalIncome,
      totalExpense,
      totalSales,
      dateRange: {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      }
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
