import { NextResponse } from 'next/server';
import { checkAdminSekolahAuth } from '@/lib/auth';
import { getGuru, getBankSiswa, upsertBankSiswa, deleteBankSiswa, resetBankData } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sekolahId = searchParams.get('sekolah_id');

    const auth = await checkAdminSekolahAuth(sekolahId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tahunPelajaran = searchParams.get('tahun_pelajaran');

    // Use provided sekolahId (if any), since superadmin is global
    const data = await getBankSiswa(sekolahId || null, tahunPelajaran || null);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { data, sekolah_id: bodySekolahId } = await request.json();
    
    // We expect the first item to have a sekolah_id, or passed in the body
    const targetSekolahId = bodySekolahId || (data && data.length > 0 ? data[0].sekolah_id : null);
    const auth = await checkAdminSekolahAuth(targetSekolahId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data harus berupa array' }, { status: 400 });
    }

    // Prepare data
    const formattedData = data.map(item => ({
      nisn: String(item.nisn).trim(),
      nama: String(item.nama).trim(),
      tingkatan: String(item.tingkatan).trim(),
      rombel: String(item.rombel).trim(),
      tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir).toISOString().split('T')[0] : null,
      sekolah_id: item.sekolah_id,
      tahun_pelajaran: item.tahun_pelajaran
    }));

    const result = await upsertBankSiswa(formattedData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.data?.length || 0 });
  } catch (error) {
    console.error('Error importing bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const sekolahId = searchParams.get('sekolah_id');
    
    // Check auth for delete action
    const auth = await checkAdminSekolahAuth(sekolahId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'reset') {
      const tahunPelajaran = searchParams.get('tahun_pelajaran');
      if (!sekolahId) {
        return NextResponse.json({ error: 'ID Sekolah wajib untuk reset' }, { status: 400 });
      }
      
      const success = await resetBankData(sekolahId, tahunPelajaran);
      return NextResponse.json({ success });
    } else {
      // Single delete
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const success = await deleteBankSiswa(id);
      return NextResponse.json({ success });
    }
  } catch (error) {
    console.error('Error deleting bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
