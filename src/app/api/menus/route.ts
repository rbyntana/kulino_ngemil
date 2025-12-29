import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all menus with sizes
export async function GET() {
  try {
    const menus = await db.menu.findMany({
      include: {
        sizes: {
          orderBy: { size: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(menus);
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

// POST create menu with sizes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, image, sizes } = body;

    if (!name || !image || !sizes || sizes.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create menu with sizes
    const menu = await db.menu.create({
      data: {
        name,
        image,
        sizes: {
          create: sizes.map((size: any) => ({
            size: size.size,
            price: parseFloat(size.price),
            stock: parseInt(size.stock)
          }))
        }
      },
      include: {
        sizes: true
      }
    });

    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error('Error creating menu:', error);
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}

// PUT update menu
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, image, sizes } = body;

    // Update menu
    const updatedMenu = await db.menu.update({
      where: { id },
      data: {
        name,
        image
      },
      include: {
        sizes: true
      }
    });

    // Handle sizes - delete existing and create new ones
    // First get existing sizes
    const existingSizes = await db.size.findMany({
      where: { menuId: id }
    });

    // Delete existing sizes
    for (const size of existingSizes) {
      await db.size.delete({ where: { id: size.id } });
    }

    // Create new sizes
    for (const sizeData of sizes) {
      await db.size.create({
        data: {
          menuId: id,
          size: sizeData.size,
          price: parseFloat(sizeData.price),
          stock: parseInt(sizeData.stock)
        }
      });
    }

    // Fetch updated menu with sizes
    const finalMenu = await db.menu.findUnique({
      where: { id },
      include: {
        sizes: {
          orderBy: { size: 'asc' }
        }
      }
    });

    return NextResponse.json(finalMenu);
  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

// DELETE menu
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.menu.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json({ error: 'Failed to delete menu' }, { status: 500 });
  }
}
