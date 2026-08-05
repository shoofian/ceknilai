import React, { useState, useEffect } from 'react';

export default function EkskulAdminPanel() {
  const [ekskuls, setEkskuls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formNama, setFormNama] = useState('');
  const [formPembina, setFormPembina] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEkskul = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/ekskul');
      if (res.ok) {
        const data = await res.json();
        setEkskuls(data);
      }
    } catch (err) {
      console.error('Error fetching ekskul', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEkskul();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setErrorMsg('Nama Ekskul wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const url = editId ? `/api/superadmin/ekskul/${editId}` : '/api/superadmin/ekskul';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_ekskul: formNama, pembina: formPembina })
      });

      if (res.ok) {
        setFormNama('');
        setFormPembina('');
        setEditId(null);
        fetchEkskul();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Gagal menyimpan data');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan koneksi server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ekskul) => {
    setFormNama(ekskul.nama_ekskul);
    setFormPembina(ekskul.pembina || '');
    setEditId(ekskul.id);
    setErrorMsg('');
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ekskul "${nama}"? Semua nilai siswa untuk ekskul ini akan ikut terhapus!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/superadmin/ekskul/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEkskul();
      } else {
        alert('Gagal menghapus ekskul');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi server');
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-title-section" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
        <h4 style={{ margin: 0, fontWeight: '800' }}>Manajemen Ekstrakurikuler</h4>
        <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>Kelola daftar ekstrakurikuler yang dapat dipilih oleh wali kelas.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Form Tambah/Edit */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h5 style={{ margin: '0 0 16px 0', fontWeight: '700' }}>
            {editId ? '✏️ Edit Ekstrakurikuler' : '➕ Tambah Ekstrakurikuler Baru'}
          </h5>
          
          {errorMsg && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                Nama Ekstrakurikuler <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Misal: Pramuka, PMR, Paskibra"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                Nama Pembina (Opsional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Nama guru pembina"
                value={formPembina}
                onChange={(e) => setFormPembina(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                {isSubmitting ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Tambahkan')}
              </button>
              {editId && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setEditId(null);
                    setFormNama('');
                    setFormPembina('');
                    setErrorMsg('');
                  }}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Daftar Ekskul */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
          ) : ekskuls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
              Belum ada ekstrakurikuler terdaftar. Silakan tambah baru.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ekskuls.map(ekskul => (
                <div key={ekskul.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {ekskul.nama_ekskul}
                    </h5>
                    {ekskul.pembina && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Pembina: <strong>{ekskul.pembina}</strong>
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleEdit(ekskul)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px', fontSize: '0.8rem' }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(ekskul.id, ekskul.nama_ekskul)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
