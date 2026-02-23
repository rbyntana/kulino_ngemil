import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';

function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    const parseDate = (dateStr: string, isEnd: boolean = false) => {
      if (!dateStr) return null;
      let year, month, day;
      const yyyyMmDd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (yyyyMmDd) {
        year = parseInt(yyyyMmDd[1]); month = parseInt(yyyyMmDd[2]); day = parseInt(yyyyMmDd[3]);
      } else {
        const ddMmYyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddMmYyyy) {
          day = parseInt(ddMmYyyy[1]); month = parseInt(ddMmYyyy[2]); year = parseInt(ddMmYyyy[3]);
        }
      }
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
      const hour = isEnd ? 23 : 0; const minute = isEnd ? 59 : 0; const second = isEnd ? 59 : 0; const millisecond = isEnd ? 999 : 0;
      return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    };

    if (startDate && endDate) {
      const start = parseDate(startDate, false); const end = parseDate(endDate, true);
      if (start && end) where.date = { gte: start, lte: end };
    } else if (startDate) {
      const start = parseDate(startDate, false);
      if (start) where.date = { gte: start };
    } else if (endDate) {
      const end = parseDate(endDate, true);
      if (end) where.date = { lte: end };
    }

    const [transactions, sales] = await Promise.all([
      db.transaction.findMany({ where, orderBy: { date: 'desc' } }),
      db.sale.findMany({
        where: { date: where.date },
        include: { menu: true, size: true },
        orderBy: { date: 'desc' }
      })
    ]);

    const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0);

    // PDF Logic
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Laporan Penjualan', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    
    const formatDateRange = (dateStr: string | null) => {
      if (!dateStr) return null;
      const parts = dateStr.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };
    let dateText = 'Semua Waktu';
    const formattedStartDate = formatDateRange(startDate);
    const formattedEndDate = formatDateRange(endDate);
    if (startDate && endDate) dateText = `${formattedStartDate} sampai ${formattedEndDate}`;
    else if (startDate) dateText = `Dari ${formattedStartDate}`;
    else if (endDate) dateText = `Sampai ${formattedEndDate}`;
    
    doc.text(`Periode: ${dateText}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Ringkasan', margin, yPos); yPos += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`, margin, yPos); yPos += 6;
    doc.text(`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`, margin, yPos); yPos += 6;
    doc.text(`Pendapatan Bersih: Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}`, margin, yPos); yPos += 6;
    doc.text(`Total Item Terjual: ${totalSales} item`, margin, yPos); yPos += 12;

    // Income List
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Pemasukan', margin, yPos); yPos += 8;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, yPos); doc.text('Deskripsi', margin + 25, yPos); doc.text('Jumlah', margin + 100, yPos);
    yPos += 5; doc.line(margin, yPos, margin + contentWidth, yPos); yPos += 5;
    doc.setFont('helvetica', 'normal');
    for (const transaction of incomeTransactions) {
      if (yPos > pageHeight - 20) { doc.addPage(); yPos = 20; }
      const dateStr = formatDate(transaction.date);
      const desc = transaction.description.length > 35 ? transaction.description.substring(0, 35) + '...' : transaction.description;
      doc.text(dateStr, margin, yPos); doc.text(desc, margin + 25, yPos); doc.text(`Rp ${transaction.amount.toLocaleString('id-ID')}`, margin + 100, yPos); yPos += 6;
    }
    yPos += 8;

    // Expense List
    if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Pengeluaran', margin, yPos); yPos += 8;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, yPos); doc.text('Deskripsi', margin + 25, yPos); doc.text('Jumlah', margin + 100, yPos);
    yPos += 5; doc.line(margin, yPos, margin + contentWidth, yPos); yPos += 5;
    doc.setFont('helvetica', 'normal');
    for (const transaction of expenseTransactions) {
      if (yPos > pageHeight - 20) { doc.addPage(); yPos = 20; }
      const dateStr = formatDate(transaction.date);
      const desc = transaction.description.length > 35 ? transaction.description.substring(0, 35) + '...' : transaction.description;
      doc.text(dateStr, margin, yPos); doc.text(desc, margin + 25, yPos); doc.text(`Rp ${transaction.amount.toLocaleString('id-ID')}`, margin + 100, yPos); yPos += 6;
    }

    // Sales Detail
    yPos += 8;
    if (yPos > pageHeight - 30) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Detail Penjualan', margin, yPos); yPos += 8;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, yPos); doc.text('Menu', margin + 25, yPos); doc.text('Ukuran', margin + 55, yPos); doc.text('Qty', margin + 80, yPos); doc.text('Total', margin + 95, yPos);
    yPos += 5; doc.line(margin, yPos, margin + contentWidth, yPos); yPos += 5;
    doc.setFont('helvetica', 'normal');
    for (const sale of sales) {
      if (yPos > pageHeight - 20) { doc.addPage(); yPos = 20; }
      const dateStr = formatDate(sale.date);
      const menuName = sale.menu.name.length > 15 ? sale.menu.name.substring(0, 15) + '...' : sale.menu.name;
      doc.text(dateStr, margin, yPos); doc.text(menuName, margin + 25, yPos); doc.text(sale.size.size, margin + 55, yPos); doc.text(sale.quantity.toString(), margin + 80, yPos); doc.text(`Rp ${sale.total.toLocaleString('id-ID')}`, margin + 95, yPos); yPos += 6;
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const pdfBytes = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="laporan-penjualan.pdf"' }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}