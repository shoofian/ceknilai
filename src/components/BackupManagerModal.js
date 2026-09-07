import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';

export default function BackupManagerModal({ isOpen, onClose, kelasId, onSuccess }) {
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
    if (!confirm('Buat backup manual sekarang?')) return;
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
      } else {
        setError(data.error || 'Gagal membuat backup');
      }
    } catch (err) {
      setError('Gagal menghubungi server');
    }
    setCreating(false);
  };

  const handleRestore = async (backupId, keterangan) => {
    if (!confirm(`PERINGATAN: Memulihkan dari backup ini ("${keterangan}") akan menimpa seluruh data kelas saat ini. Siswa yang dihapus akan kembali, dan perubahan terbaru akan hilang. Lanjutkan?`)) return;
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
        alert('Backup berhasil dipulihkan!');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Backup & Pemulihan">
      <div className="p-4 flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Sistem secara otomatis menyimpan kondisi kelas Anda (termasuk daftar siswa dan nilai) sebelum sinkronisasi Bank Data. Anda juga dapat membuat backup manual sewaktu-waktu.
        </p>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-800">Daftar Backup Tersedia</h3>
          <button 
            onClick={handleCreateBackup}
            disabled={creating || loading || restoring}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {creating ? 'Membuat...' : 'Buat Backup Manual'}
          </button>
        </div>

        <div className="border border-gray-200 rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Memuat data...</div>
          ) : backups.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Belum ada backup untuk kelas ini.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Waktu</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Keterangan</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                      {new Date(b.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.keterangan}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button 
                        onClick={() => handleRestore(b.id, b.keterangan)}
                        disabled={restoring}
                        className="text-orange-600 hover:text-orange-800 disabled:text-gray-400 font-medium"
                      >
                        {restoring ? 'Memulihkan...' : 'Pulihkan'}
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
