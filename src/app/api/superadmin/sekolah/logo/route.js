import { NextResponse } from 'next/server';
import { checkAdminSekolahAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const sekolahId = formData.get('sekolahId');
    const file = formData.get('file');

    if (!sekolahId || !file || !supabase) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const auth = await checkAdminSekolahAuth(sekolahId);
    if (!auth) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
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
