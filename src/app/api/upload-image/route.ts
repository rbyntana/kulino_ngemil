import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/blob';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang di-upload' }, { status: 400 });
    }

    // Upload ke Vercel
    const blob = new Blob([file], { type: file.type });
    
    const vercelBlob = createClient(process.env.VERCEL_BLOB_TOKEN!, {
      access: process.env.VERCEL_ACCESS_TOKEN!, // Pastikan environment variable Vercel tersedia di project setting
    });

    const { url } = await vercelBlob.upload({
      filename: `${Date.now()}-${file.name}`,
      body: blob,
      options: {
        contentType: file.type,
        cacheControl: 'public',
        upsert: 'true'
      }
    });

    // Simpan URL ke database
    const imageUrl = `${process.env.NEXT_PUBLIC_URL}/${url}`;

    // Kirim URL string kembali ke frontend
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading to Vercel:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}