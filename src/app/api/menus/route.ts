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
    const body = await request.json()
    const { id, name, image, sizes } = body

    if (!id || !name || !sizes) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      // 1️⃣ Update menu
      await tx.menu.update({
        where: { id },
        data: { name, image },
      })

      // 2️⃣ Ambil ID size yang MASIH ADA
      const incomingSizeIds = sizes
        .filter((s: any) => s.id)
        .map((s: any) => s.id)

      // 3️⃣ HAPUS size lama yang tidak ada di form 🔥
      await tx.size.deleteMany({
        where: {
          menuId: id,
          id: {
            notIn: incomingSizeIds.length > 0 ? incomingSizeIds : ['__none__'],
          },
        },
      })

      // 4️⃣ Update / Create size
      for (const s of sizes) {
        if (s.id) {
          await tx.size.update({
            where: { id: s.id },
            data: {
              size: s.size,
              price: Number(s.price),
              stock: Number(s.stock),
            },
          })
        } else {
          await tx.size.create({
            data: {
              menuId: id,
              size: s.size,
              price: Number(s.price),
              stock: Number(s.stock),
            },
          })
        }
      }
    })

    const finalMenu = await db.menu.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { size: 'asc' } },
      },
    })

    return NextResponse.json(finalMenu)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Gagal update menu' },
      { status: 500 }
    )
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
