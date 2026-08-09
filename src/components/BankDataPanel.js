import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function BankDataPanel({ targetSekolahId }) {
  const [bankData, setBankData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const [filterRombel, setFilterRombel] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
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
        setCurrentPage(1); // Reset page on new data
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

      // Cari baris header (maksimal cek 20 baris pertama)
      let headerRowIndex = -1;
      let headers = [];
      
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i] || [];
        const rowStrs = row.map(cell => String(cell || "").toLowerCase().trim());
        
        const hasNisn = rowStrs.some(h => h.includes("nisn"));
        const hasNama = rowStrs.some(h => h.includes("nama"));
        const hasRombel = rowStrs.some(h => h.includes("rombel"));
        
        if (hasNisn && hasNama && hasRombel) {
          headerRowIndex = i;
          headers = rowStrs;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("File Excel harus memiliki minimal kolom: NISN, Nama, dan Rombel.");
      }

      const idxNisn = headers.findIndex(h => h.includes("nisn"));
      const idxNama = headers.findIndex(h => h.includes("nama"));
      const idxTingkatan = headers.findIndex(h => h === "tingkat" || h === "tingkatan" || h === "kelas");
      const idxRombel = headers.findIndex(h => h.includes("rombel"));
      const idxTanggalLahir = headers.findIndex(h => h.includes("tanggal lahir") || h.includes("tgl_lahir"));

      const detectTingkatan = (rombelStr) => {
        const str = String(rombelStr || "").toUpperCase().trim();
        const romanMatch = str.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/);
        if (romanMatch) {
          const map = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12' };
          return map[romanMatch[1]];
        }
        const digitMatch = str.match(/^([1-9]|10|11|12)\b/);
        if (digitMatch) {
          return digitMatch[1];
        }
        return "Uncategorized";
      };

      const formattedData = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
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

        const rombelVal = String(row[idxRombel]).trim();
        let tingkatanVal = idxTingkatan !== -1 && row[idxTingkatan] ? String(row[idxTingkatan]).trim() : detectTingkatan(rombelVal);

        formattedData.push({
          nisn: String(row[idxNisn]).trim(),
          nama: String(row[idxNama]).trim(),
          tingkatan: tingkatanVal,
          rombel: rombelVal,
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

  const uniqueTingkat = [...new Set(bankData.map(item => item.tingkatan))].filter(Boolean).sort((a, b) => Number(a) - Number(b));
  const uniqueRombel = [...new Set(bankData.map(item => item.rombel))].filter(Boolean).sort();
  const uniqueTahun = [...new Set(bankData.map(item => item.tahun_pelajaran))].filter(Boolean).sort().reverse();

  const filteredData = bankData.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = String(item.nama || '').toLowerCase().includes(searchLower) ||
                          String(item.nisn || '').toLowerCase().includes(searchLower) ||
                          String(item.rombel || '').toLowerCase().includes(searchLower) ||
                          String(item.tahun_pelajaran || '').toLowerCase().includes(searchLower);
    const matchesTingkat = filterTingkat ? String(item.tingkatan) === filterTingkat : true;
    const matchesRombel = filterRombel ? String(item.rombel) === filterRombel : true;
    const matchesTahun = filterTahun ? String(item.tahun_pelajaran) === filterTahun : true;
    
    return matchesSearch && matchesTingkat && matchesRombel && matchesTahun;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // reset page if filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTingkat, filterRombel, filterTahun]);

  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h4 style={{ margin: 0, fontWeight: "800" }}>Bank Data Siswa</h4>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select 
            className="form-input" 
            value={filterTingkat} 
            onChange={e => setFilterTingkat(e.target.value)}
            style={{ maxWidth: "120px", padding: "8px 12px", fontSize: "0.85rem" }}
          >
            <option value="">Semua Tingkat</option>
            {uniqueTingkat.map(t => <option key={t} value={t}>Tingkat {t}</option>)}
          </select>
          <select 
            className="form-input" 
            value={filterRombel} 
            onChange={e => setFilterRombel(e.target.value)}
            style={{ maxWidth: "150px", padding: "8px 12px", fontSize: "0.85rem" }}
          >
            <option value="">Semua Rombel</option>
            {uniqueRombel.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select 
            className="form-input" 
            value={filterTahun} 
            onChange={e => setFilterTahun(e.target.value)}
            style={{ maxWidth: "150px", padding: "8px 12px", fontSize: "0.85rem" }}
          >
            <option value="">Semua Tahun</option>
            {uniqueTahun.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            placeholder="🔍 Cari nama, NISN..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: "200px", padding: "8px 12px", fontSize: "0.85rem" }}
          />
        </div>
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
              {paginatedData.map((siswa) => (
                <tr key={siswa.id || `siswa_${siswa.nisn}`}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} siswa
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: "6px 12px", fontSize: "0.85rem" }}
              >
                Sebelumnya
              </button>
              <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: "0.85rem", fontWeight: "600" }}>
                Halaman {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: "6px 12px", fontSize: "0.85rem" }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
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
