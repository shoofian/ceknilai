import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo');
    const sekolahId = formData.get('sekolahId');

    if (!file || !sekolahId) {
      return NextResponse.json({ error: 'File logo dan ID Sekolah wajib dikirim' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${sekolahId}.${fileExt}`;

    // Upload to Supabase Storage bucket 'logos'
    const { data, error } = await supabase
      .storage
      .from('logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite existing
      });

    if (error) {
      console.error('Error uploading logo to Supabase:', error);
      return NextResponse.json({ error: 'Gagal mengunggah logo ke server' }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('logos')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: publicUrlData.publicUrl + '?t=' + new Date().getTime() });
  } catch (err) {
    console.error('Unexpected error in logo upload API:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
