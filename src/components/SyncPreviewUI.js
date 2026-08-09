import React from 'react';

export default function SyncPreviewUI({
  syncPreviewData,
  syncSelectedAdded,
  setSyncSelectedAdded,
  syncSelectedUpdated,
  setSyncSelectedUpdated,
  syncSelectedRemoved,
  setSyncSelectedRemoved,
  handleSeparateStudent,
  onCommit,
  onCancel,
  isSyncingBankData,
  title = "Pratinjau Sinkronisasi Bank Data",
  commitText = "Simpan ke Bank Data"
}) {
  return (
    <div className="modal-overlay" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", justifyContent: "center", alignItems: "center"
    }}>
      <div className="modal-content" style={{
        background: "var(--bg-primary)", padding: "24px",
        borderRadius: "16px", maxWidth: "600px", width: "95%",
        maxHeight: "90vh", overflowY: "auto"
      }}>
        <h3 style={{ marginTop: 0, color: "var(--primary)" }}>{title}</h3>
        
        {syncPreviewData.removed && syncPreviewData.removed.length > 0 && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderLeft: "4px solid var(--danger)",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "4px"
          }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--danger)" }}>⚠️ Peringatan Penghapusan Siswa</h4>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              Jika Anda melanjutkan, <strong>{syncPreviewData.removed.length} siswa</strong> yang tidak lagi ada di Bank Data akan dihapus beserta <strong>seluruh data nilainya</strong> secara permanen.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {syncPreviewData.added && syncPreviewData.added.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#10b981" }}>Menambahkan ({syncPreviewData.added.length}):</h4>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={syncSelectedAdded.size === syncPreviewData.added.length && syncPreviewData.added.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSyncSelectedAdded(new Set(syncPreviewData.added.map(s => s.nisn)));
                      else setSyncSelectedAdded(new Set());
                    }}
                  /> Pilih Semua
                </label>
              </div>
              <ul style={{ margin: 0, paddingLeft: "10px", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto", listStyleType: "none" }}>
                {syncPreviewData.added.map(s => (
                  <li key={s.nisn} style={{ marginBottom: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input 
                        type="checkbox"
                        checked={syncSelectedAdded.has(s.nisn)}
                        onChange={(e) => {
                          const newSet = new Set(syncSelectedAdded);
                          if (e.target.checked) newSet.add(s.nisn);
                          else newSet.delete(s.nisn);
                          setSyncSelectedAdded(newSet);
                        }}
                      />
                      {s.nama} ({s.nisn})
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {syncPreviewData.updated && syncPreviewData.updated.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#f59e0b" }}>Pembaruan Data (Merger) ({syncPreviewData.updated.length}):</h4>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={syncSelectedUpdated.size === syncPreviewData.updated.length && syncPreviewData.updated.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSyncSelectedUpdated(new Set(syncPreviewData.updated.map(s => s.nisnLama)));
                      else setSyncSelectedUpdated(new Set());
                    }}
                  /> Pilih Semua
                </label>
              </div>
              <ul style={{ margin: 0, paddingLeft: "10px", fontSize: "0.85rem", maxHeight: "200px", overflowY: "auto", listStyleType: "none" }}>
                {syncPreviewData.updated.map(s => (
                  <li key={s.nisnLama} style={{ marginBottom: "8px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", flex: 1 }}>
                      <input 
                        type="checkbox"
                        checked={syncSelectedUpdated.has(s.nisnLama)}
                        onChange={(e) => {
                          const newSet = new Set(syncSelectedUpdated);
                          if (e.target.checked) newSet.add(s.nisnLama);
                          else newSet.delete(s.nisnLama);
                          setSyncSelectedUpdated(newSet);
                        }}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <span style={{ fontWeight: "600" }}>{s.namaLama} ({s.nisnLama})</span>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {s.nameChanged && <span>• Nama: <del style={{ opacity: 0.7 }}>{s.namaLama}</del> ➔ <span style={{ color: "var(--primary)", fontWeight: "600" }}>{s.namaBaru}</span></span>}
                          {s.nisnChanged && <span>• NISN: <del style={{ opacity: 0.7 }}>{s.nisnLama}</del> ➔ <span style={{ color: "var(--primary)", fontWeight: "600" }}>{s.nisnBaru}</span></span>}
                          {s.dobChanged && <span>• Tgl Lahir: <del style={{ opacity: 0.7 }}>{s.tanggalLahirLama || 'kosong'}</del> ➔ <span style={{ color: "var(--primary)", fontWeight: "600" }}>{s.tanggalLahirBaru || 'kosong'}</span></span>}
                        </div>
                      </div>
                    </label>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleSeparateStudent(s)}
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      title="Batal merger (keduanya bukan orang yang sama)"
                    >
                      ⎇ Pisahkan
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {syncPreviewData.removed && syncPreviewData.removed.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "var(--danger)" }}>Menghapus ({syncPreviewData.removed.length}):</h4>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={syncSelectedRemoved.size === syncPreviewData.removed.length && syncPreviewData.removed.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSyncSelectedRemoved(new Set(syncPreviewData.removed.map(s => s.nisn)));
                      else setSyncSelectedRemoved(new Set());
                    }}
                  /> Pilih Semua
                </label>
              </div>
              <ul style={{ margin: 0, paddingLeft: "10px", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto", listStyleType: "none" }}>
                {syncPreviewData.removed.map(s => (
                  <li key={s.nisn} style={{ marginBottom: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--danger)" }}>
                      <input 
                        type="checkbox"
                        checked={syncSelectedRemoved.has(s.nisn)}
                        onChange={(e) => {
                          const newSet = new Set(syncSelectedRemoved);
                          if (e.target.checked) newSet.add(s.nisn);
                          else newSet.delete(s.nisn);
                          setSyncSelectedRemoved(newSet);
                        }}
                      />
                      <del>{s.nama} ({s.nisn})</del>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={isSyncingBankData}
          >
            Batal
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onCommit}
            disabled={isSyncingBankData}
          >
            {isSyncingBankData ? "Menyimpan..." : commitText}
          </button>
        </div>
      </div>
    </div>
  );
}
