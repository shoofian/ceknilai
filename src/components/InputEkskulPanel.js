import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function InputEkskulPanel({ siswa, tahunAjaran, semester }) {
  const [masterEkskul, setMasterEkskul] = useState([]);
  const [nilaiEkskul, setNilaiEkskul] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form States
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [formEkskulId, setFormEkskulId] = useState('');
  const [formPredikat, setFormPredikat] = useState('Sangat Baik');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // 1. Ambil daftar master ekskul
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await fetch('/api/superadmin/ekskul');
        if (res.ok) {
          const data = await res.json();
          setMasterEkskul(data || []);
        }
      } catch (err) {
        console.error('Gagal mengambil master ekskul', err);
      }
    };
    fetchMaster();
  }, []);

  // 2. Ambil nilai ekskul kelas ini
  const fetchNilaiEkskul = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/walikelas/ekskul?tahun_ajaran=${encodeURIComponent(tahunAjaran)}&semester=${encodeURIComponent(semester)}`);
      if (res.ok) {
        const data = await res.json();
        setNilaiEkskul(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNilaiEkskul();
  }, [tahunAjaran, semester]);

  const openModal = (siswa) => {
    setSelectedSiswa(siswa);
    setFormEkskulId(masterEkskul.length > 0 ? masterEkskul[0].id : '');
    setFormPredikat('Sangat Baik');
    setFormKeterangan('');
    setSubmitError('');
    setModalOpen(true);
  };

  const handleEdit = (ekskul) => {
    setSelectedSiswa({ nisn: ekskul.nisn, nama: ekskul.bank_siswa?.nama || '-' });
    setFormEkskulId(ekskul.ekskul_id);
    setFormPredikat(ekskul.predikat);
    setFormKeterangan(ekskul.keterangan || '');
    setSubmitError('');
    setModalOpen(true);
  };

  const saveEkskul = async () => {
    if (!formEkskulId) {
      setSubmitError('Pilih ekskul terlebih dahulu');
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitError('');
      const payload = {
        nisn: selectedSiswa.nisn,
        ekskul_id: formEkskulId,
        predikat: formPredikat,
        keterangan: formKeterangan,
        tahun_ajaran: tahunAjaran,
        semester: semester
      };

      const res = await fetch('/api/walikelas/ekskul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchNilaiEkskul();
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Gagal menyimpan nilai ekskul');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Terjadi kesalahan server: ' + (err.message || 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus nilai ekskul ini?')) return;
    try {
      const res = await fetch(`/api/walikelas/ekskul/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchNilaiEkskul();
      } else {
        alert('Gagal menghapus nilai ekskul');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontWeight: '800' }}>🏅 Input Nilai Ekstrakurikuler</h4>
        {masterEkskul.length === 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--danger)', padding: '6px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
            Belum ada data Master Ekskul. Minta Superadmin untuk menambahkannya.
          </span>
        )}
      </div>

      <table className="premium-table">
        <thead>
          <tr>
            <th style={{ width: '50px', textAlign: 'center' }}>No</th>
            <th>Nama Siswa</th>
            <th style={{ minWidth: '100px' }}>NISN</th>
            <th>Ekstrakurikuler yang Diikuti</th>
            <th>Nilai (Predikat & Deskripsi)</th>
            <th style={{ width: '150px', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {siswa.map((s, idx) => {
            const siswaEkskuls = nilaiEkskul.filter(n => n.nisn === s.nisn);
            
            return (
              <tr key={s.nisn}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{s.nama}</td>
                <td><code>{s.nisn}</code></td>
                
                {/* Kolom Ekstrakurikuler */}
                <td>
                  {siswaEkskuls.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {siswaEkskuls.map(ne => (
                        <div key={`ekskul-${ne.id}`} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border-color)' }}>
                          <span style={{ fontWeight: '600' }}>{ne.master_ekskul?.nama_ekskul || '-'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* Kolom Nilai */}
                <td>
                  {siswaEkskuls.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {siswaEkskuls.map(ne => (
                        <div key={`nilai-${ne.id}`} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                          <strong style={{ color: 'var(--primary)' }}>{ne.predikat}</strong>
                          {ne.keterangan && <span style={{ color: 'var(--text-secondary)' }}> | {ne.keterangan}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => openModal(s)}
                      disabled={masterEkskul.length === 0}
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.85rem', width: '100%' }}
                    >
                      ➕ Tambah Nilai
                    </button>
                    {siswaEkskuls.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {siswaEkskuls.map(ne => (
                           <button 
                             key={`btn-hapus-${ne.id}`}
                             onClick={() => handleDelete(ne.id)}
                             className="btn btn-secondary" 
                             title={`Hapus ${ne.master_ekskul?.nama_ekskul || 'Ekskul'}`}
                             style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                           >
                             ✖ Hapus
                           </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal Tambah Ekskul */}
      {modalOpen && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div className="glass-card" style={{ 
            padding: '24px', 
            width: '100%', 
            maxWidth: '500px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            backgroundColor: 'var(--bg-primary)' 
          }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Tambah Nilai Ekskul</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Siswa: <strong style={{ color: 'var(--text-primary)' }}>{selectedSiswa?.nama}</strong>
            </p>

            {submitError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {submitError}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); saveEkskul(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>Pilih Ekstrakurikuler</label>
                <select 
                  className="form-input" 
                  value={formEkskulId} 
                  onChange={e => setFormEkskulId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Ekskul --</option>
                  {masterEkskul.map(e => (
                    <option key={e.id} value={e.id}>{e.nama_ekskul} {e.pembina ? `(Pembina: ${e.pembina})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>Predikat</label>
                <select 
                  className="form-input" 
                  value={formPredikat} 
                  onChange={e => setFormPredikat(e.target.value)}
                  required
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup">Cukup</option>
                  <option value="Kurang">Kurang</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>Keterangan (Deskripsi)</label>
                <textarea 
                  className="form-input" 
                  placeholder="Misal: Aktif mengikuti kegiatan..."
                  value={formKeterangan} 
                  onChange={e => setFormKeterangan(e.target.value)}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
