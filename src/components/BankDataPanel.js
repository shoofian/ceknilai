import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function BankDataPanel({ targetSekolahId }) {
  const [bankData, setBankData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  
  const [targetTahunPelajaran, setTargetTahunPelajaran] = useState("2024/2025");
  
  useEffect(() => {
    fetchBankData();
  }, [targetSekolahId]);

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const url = targetSekolahId ? `/api/superadmin/bank-siswa?sekolah_id=${targetSekolahId}` : '/api/superadmin/bank-siswa';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBankData(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data bank siswa:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus data siswa ini dari Bank Data?")) return;
    try {
      const res = await fetch(`/api/superadmin/bank-siswa?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBankData();
      } else {
        alert("Gagal menghapus data.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetBankData = async () => {
    if (!targetSekolahId) {
      alert("Silakan pilih Sekolah Tujuan terlebih dahulu.");
      return;
    }
    
    setIsDeletingBulk(true);
    try {
      const res = await fetch(`/api/superadmin/bank-siswa?action=reset&sekolah_id=${targetSekolahId}&tahun_pelajaran=${encodeURIComponent(targetTahunPelajaran)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setUploadMessage("Bank data berhasil direset!");
        setTimeout(() => setUploadMessage(""), 3000);
        setShowConfirmReset(false);
        fetchBankData();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mereset data");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!targetSekolahId || !targetTahunPelajaran) {
      alert("Harap pilih Sekolah dan Tahun Pelajaran terlebih dahulu sebelum mengunggah file.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadMessage("Memproses file...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      if (rawData.length < 2) {
        throw new Error("File Excel kosong atau tidak valid.");
      }

      // Cari indeks kolom
      const headers = rawData[0].map(h => String(h).toLowerCase().trim());
      const idxNisn = headers.findIndex(h => h.includes("nisn"));
      const idxNama = headers.findIndex(h => h.includes("nama"));
      const idxTingkatan = headers.findIndex(h => h === "tingkat" || h === "tingkatan" || h === "kelas");
      const idxRombel = headers.findIndex(h => h.includes("rombel"));
      const idxTanggalLahir = headers.findIndex(h => h.includes("tanggal lahir") || h.includes("tgl_lahir"));

      if (idxNisn === -1 || idxNama === -1 || idxTingkatan === -1 || idxRombel === -1) {
        throw new Error("File Excel harus memiliki kolom: NISN, Nama, Tingkat, dan Rombel.");
      }

      const formattedData = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row[idxNisn] || !row[idxNama]) continue;
        
        let tglLahir = null;
        if (row[idxTanggalLahir]) {
          // Parse excel date if it's a number
          if (typeof row[idxTanggalLahir] === 'number') {
            const date = new Date(Math.round((row[idxTanggalLahir] - 25569) * 86400 * 1000));
            tglLahir = date.toISOString().split('T')[0];
          } else {
            tglLahir = String(row[idxTanggalLahir]).trim();
          }
        }

        formattedData.push({
          nisn: String(row[idxNisn]).trim(),
          nama: String(row[idxNama]).trim(),
          tingkatan: String(row[idxTingkatan]).trim(),
          rombel: String(row[idxRombel]).trim(),
          tanggal_lahir: tglLahir,
          sekolah_id: targetSekolahId,
          tahun_pelajaran: targetTahunPelajaran
        });
      }

      setUploadMessage(`Menyimpan ${formattedData.length} data ke server...`);

      const res = await fetch("/api/superadmin/bank-siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formattedData })
      });

      if (res.ok) {
        const resData = await res.json();
        setUploadMessage(`Berhasil menyimpan ${resData.count} data!`);
        setTimeout(() => setUploadMessage(""), 3000);
        fetchBankData();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal menyimpan ke server");
      }
    } catch (err) {
      console.error(err);
      setUploadMessage("");
      alert(err.message || "Terjadi kesalahan saat memproses file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filteredData = bankData.filter(item => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.rombel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tahun_pelajaran.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h4 style={{ margin: 0, fontWeight: "800" }}>Bank Data Siswa</h4>
        <input
          type="text"
          placeholder="🔍 Cari nama, NISN, atau rombel..."
          className="form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "300px", padding: "8px 12px", fontSize: "0.85rem" }}
        />
      </div>

      {!targetSekolahId ? (
        <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px dashed var(--border-color)", color: "var(--text-muted)", marginTop: "20px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🏫</div>
          <h5 style={{ margin: "0 0 8px 0" }}>Sekolah Belum Dipilih</h5>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>Silakan cari dan pilih sekolah di panel atas untuk mengelola data siswa.</p>
        </div>
      ) : (
      <>
      <div style={{ background: "var(--background-secondary)", padding: "16px", borderRadius: "12px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1", minWidth: "150px" }}>
          <input
        <div style={{ flex: "1", minWidth: "150px" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>Tahun Pelajaran <span style={{ color: "var(--danger)" }}>*</span></label>
          <select 
            className="form-input"
            value={targetTahunPelajaran}
            onChange={(e) => setTargetTahunPelajaran(e.target.value)}
          >
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <label className={`btn ${uploading ? 'btn-secondary' : 'btn-primary'}`} style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
            {uploading ? "⏳ Memproses..." : "📤 Impor Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              if (!targetSekolahId) {
                alert("Pilih sekolah terlebih dahulu sebelum menghapus data.");
                return;
              }
              setShowConfirmReset(true);
            }}
            disabled={isDeletingBulk || uploading}
          >
            {isDeletingBulk ? "🗑️ Menghapus..." : "🗑️ Hapus Semua"}
          </button>
        </div>
      </div>
      {uploadMessage && <p style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "600" }}>{uploadMessage}</p>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>Memuat data...</div>
      ) : filteredData.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>NISN</th>
                <th>Nama</th>
                <th>Tingkat</th>
                <th>Rombel</th>
                <th>Sekolah ID</th>
                <th>Tahun</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 100).map((siswa) => (
                <tr key={siswa.id}>
                  <td><code>{siswa.nisn}</code></td>
                  <td><strong>{siswa.nama}</strong></td>
                  <td>{siswa.tingkatan}</td>
                  <td>{siswa.rombel}</td>
                  <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{siswa.sekolah_id?.substring(0, 8)}...</td>
                  <td>{siswa.tahun_pelajaran}</td>
                  <td>
                    <button onClick={() => handleDelete(siswa.id)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)" }}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length > 100 && (
            <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "12px" }}>
              Menampilkan 100 data teratas dari {filteredData.length} hasil pencarian.
            </p>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Belum ada data di Bank Siswa.
        </div>
      )}

      {showConfirmReset && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            background: "var(--bg-primary)", padding: "24px",
            borderRadius: "16px", maxWidth: "400px", width: "90%"
          }}>
            <h3 style={{ color: "var(--danger)", marginTop: 0 }}>⚠️ Hapus Semua Data?</h3>
            <p>Anda yakin ingin menghapus <strong>seluruh</strong> data siswa untuk sekolah dan tahun pelajaran yang dipilih? Tindakan ini tidak dapat dibatalkan!</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirmReset(false)}>Batal</button>
              <button className="btn btn-danger" onClick={handleResetBankData} disabled={isDeletingBulk}>
                {isDeletingBulk ? "Menghapus..." : "Ya, Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
