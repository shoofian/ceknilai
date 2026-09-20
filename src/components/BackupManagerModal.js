import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useConfirm } from "@/components/ConfirmProvider";

export default function BackupManagerModal({ isOpen, onClose, kelasId, onSuccess }) {
  const { confirmAsync, alertAsync, promptAsync } = useConfirm();

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kelas/${kelasId}/backup`);
      const data = await res.json();
      if (data.backups) {
        setBackups(data.backups);
      }
    } catch (err) {
      setError('Gagal mengambil daftar backup');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen, kelasId]);

  const handleCreateBackup = async () => {
    if (!await confirmAsync('Buat backup manual sekarang?')) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/kelas/${kelasId}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keterangan: 'Backup Manual oleh Guru' })
      });
      const data = await res.json();
      if (data.success) {
        fetchBackups();
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Gagal membuat backup');
      }
    } catch (err) {
      setError('Gagal menghubungi server');
    }
    setCreating(false);
  };

  const handleRestore = async (backupId, keterangan) => {
    if (!await confirmAsync(`PERINGATAN: Memulihkan dari backup ini ("${keterangan}") akan menimpa seluruh data kelas saat ini. Siswa yang dihapus akan kembali, dan perubahan terbaru akan hilang. Lanjutkan?`)) return;
    setRestoring(true);
    setError('');
    try {
      const res = await fetch(`/api/kelas/${kelasId}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId })
      });
      const data = await res.json();
      if (data.success) {
        await alertAsync('Backup berhasil dipulihkan!');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Gagal memulihkan backup');
      }
    } catch (err) {
      setError('Gagal menghubungi server');
    }
    setRestoring(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🛡️ Manajemen Backup & Pemulihan">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
        
        {/* Info Box */}
        <div className="glass-card" style={{ padding: "16px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", borderLeft: "4px solid var(--primary)" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Sistem secara otomatis menyimpan kondisi kelas Anda (termasuk daftar siswa dan nilai) sebelum sinkronisasi Bank Data. Anda juga dapat membuat backup manual sewaktu-waktu.
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "var(--radius-md)", fontSize: "0.9rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
            Daftar Riwayat Backup
          </h3>
          <button 
            onClick={handleCreateBackup}
            disabled={creating || loading || restoring}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", padding: "8px 16px" }}
          >
            {creating ? <span className="btn-spinner" /> : "➕"}
            {creating ? 'Membuat...' : 'Buat Backup Manual'}
          </button>
        </div>

        {/* Tabel Data */}
        <div style={{ 
          border: "1px solid var(--border-color)", 
          borderRadius: "var(--radius-lg)", 
          overflow: "hidden", 
          maxHeight: "50vh", 
          overflowY: "auto",
          backgroundColor: "var(--bg-primary)"
        }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <span className="btn-spinner" style={{ width: "24px", height: "24px", borderTopColor: "var(--primary)" }} />
              Memuat riwayat backup...
            </div>
          ) : backups.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.5 }}>🗃️</div>
              Belum ada data backup untuk kelas ini.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead style={{ position: "sticky", top: 0, backgroundColor: "var(--bg-secondary)", zIndex: 1, boxShadow: "0 1px 0 var(--border-color)" }}>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)" }}>Waktu</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)" }}>Keterangan</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "var(--text-secondary)" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, idx) => (
                  <tr key={b.id} style={{ borderBottom: idx !== backups.length - 1 ? "1px solid var(--border-color)" : "none", transition: "background-color 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: "500", whiteSpace: "nowrap" }}>
                      {new Date(b.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {b.keterangan === 'Auto-backup' ? <span style={{ fontSize: "0.8rem", padding: "2px 8px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", borderRadius: "12px", fontWeight: "600" }}>Otomatis</span> : <span style={{ fontSize: "0.8rem", padding: "2px 8px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: "12px", fontWeight: "600" }}>Manual</span>}
                        <span>{b.keterangan}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button 
                        onClick={() => handleRestore(b.id, b.keterangan)}
                        disabled={restoring}
                        className="btn btn-outline"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#f59e0b", borderColor: "rgba(245, 158, 11, 0.3)", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        onMouseOver={e => !restoring && (e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.1)")}
                        onMouseOut={e => !restoring && (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {restoring ? <span className="btn-spinner" style={{ width: "12px", height: "12px", borderTopColor: "#f59e0b" }} /> : "⏪"}
                        {restoring ? 'Memulihkan' : 'Pulihkan Data'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
