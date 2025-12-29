import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST create sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menuId, sizeId, quantity } = body;

    // Get the size details
    const size = await db.size.findUnique({
      where: { id: sizeId },
      include: { menu: true }
    });

    if (!size) {
      return NextResponse.json({ error: 'Size not found' }, { status: 404 });
    }

    // Check if enough stock
    if (size.stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    const total = size.price * quantity;

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

    console.log('=== SAVING SALE ===');
    console.log('Local time:', now.toISOString());
    console.log('UTC time:', utcNow.toISOString());
    console.log('Menu:', size.menu.name);
    console.log('Size:', size.size.size);
    console.log('Quantity:', quantity);
    console.log('Total:', total);

    // Create sale with UTC date
    const sale = await db.sale.create({
      data: {
        menuId,
        sizeId,
        quantity: parseInt(quantity),
        price: size.price,
        total,
        date: utcNow  // Store as UTC
      }
    });

    console.log('Saved sale with date:', sale.date);

    // Update stock
    await db.size.update({
      where: { id: sizeId },
      data: {
        stock: size.stock - quantity
      }
    });

    // Create income transaction with UTC date and link to sale
    const transaction = await db.transaction.create({
      data: {
        type: 'INCOME',
        amount: total,
        description: `Penjualan ${size.menu.name} - ${size.size} (${quantity}x)`,
        date: utcNow,  // Store as UTC
        sale: {
          connect: {
            id: sale.id
          }
        }
      }
    });

    console.log('Created transaction with date:', transaction.date);

    // Update sale with transaction
    const updatedSale = await db.sale.update({
      where: { id: sale.id },
      data: { transactionId: transaction.id }
    });

    return NextResponse.json(updatedSale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
