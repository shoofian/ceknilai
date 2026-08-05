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
  const [formPredikat, setFormPredikat] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Master Ekskul
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await fetch('/api/superadmin/ekskul');
        if (res.ok) {
          const data = await res.json();
          setMasterEkskul(data);
        }
      } catch (err) {
        console.error('Failed to fetch master ekskul', err);
      }
    };
    fetchMaster();
  }, []);

  // Fetch Nilai Ekskul for all students in the class
  const fetchNilaiEkskul = async () => {
    setLoading(true);
    try {
      const promises = siswa.map(s => 
        fetch(`/api/walikelas/ekskul?nisn=${s.nisn}&tahun_ajaran=${encodeURIComponent(tahunAjaran)}&semester=${encodeURIComponent(semester)}`)
          .then(res => res.json())
      );
      const results = await Promise.all(promises);
      const allNilai = results.flat().filter(n => !n.error);
      setNilaiEkskul(allNilai);
    } catch (err) {
      console.error('Failed to fetch nilai ekskul', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (siswa.length > 0) {
      fetchNilaiEkskul();
    }
  }, [siswa, tahunAjaran, semester]);

  const handleOpenModal = (s) => {
    setSelectedSiswa(s);
    setFormEkskulId('');
    setFormPredikat('Sangat Baik');
    setFormKeterangan('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formEkskulId || !formPredikat) {
      alert('Ekskul dan Predikat harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
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
        alert(data.error || 'Gagal menyimpan nilai ekskul');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan server');
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
            <th style={{ width: '50px' }}>No</th>
            <th style={{ minWidth: '150px' }}>Nama Siswa</th>
            <th style={{ minWidth: '100px' }}>NISN</th>
            <th>Ekstrakurikuler yang Diikuti</th>
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
                <td>
                  {siswaEkskuls.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada ekskul</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {siswaEkskuls.map(ne => (
                        <div key={ne.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{ne.master_ekskul.nama_ekskul}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Predikat: <strong style={{ color: 'var(--primary)' }}>{ne.predikat}</strong>
                              {ne.keterangan && <span> | {ne.keterangan}</span>}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(ne.id)}
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => handleOpenModal(s)}
                    disabled={masterEkskul.length === 0}
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    ➕ Tambah Nilai
                  </button>
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

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
