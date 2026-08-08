import React, { useState, useEffect } from 'react';
import BankDataPanel from './BankDataPanel';
import EkskulAdminPanel from './EkskulAdminPanel';

export default function ManajemenSekolahPanel({ targetSekolahId }) {
  const [activeMenu, setActiveMenu] = useState("identitas");
  const [sekolah, setSekolah] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const [logoUrl, setLogoUrl] = useState("");

  const [formData, setFormData] = useState({
    nama: "",
    npsn: "",
    alamat: "",
    kode_pos: "",
    desa_kelurahan: "",
    kecamatan: "",
    kabupaten_kota: "",
    provinsi: "",
    website: "",
    email: ""
  });

  useEffect(() => {
    if (!targetSekolahId) {
      setSekolah(null);
      return;
    }
    const fetchSekolah = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`/api/superadmin/sekolah/${targetSekolahId}`);
        if (res.ok) {
          const data = await res.json();
          setSekolah(data);
          setFormData({
            nama: data.nama || "",
            npsn: data.npsn || "",
            alamat: data.alamat || "",
            kode_pos: data.kode_pos || "",
            desa_kelurahan: data.desa_kelurahan || "",
            kecamatan: data.kecamatan || "",
            kabupaten_kota: data.kabupaten_kota || "",
            provinsi: data.provinsi || "",
            website: data.website || "",
            email: data.email || ""
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSekolah();
  }, [targetSekolahId]);

  const handleSaveIdentitas = async (e) => {
    e.preventDefault();
    if (!targetSekolahId) return;
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/superadmin/sekolah/${targetSekolahId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSuccessMsg("Identitas sekolah berhasil diperbarui!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Gagal menyimpan data");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan koneksi server");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !targetSekolahId) return;

    setUploadingLogo(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("logo", file);
    formData.append("sekolahId", targetSekolahId);

    try {
      const res = await fetch("/api/superadmin/sekolah/logo", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Logo sekolah berhasil diunggah!");
        setLogoVersion(Date.now());
        setLogoUrl(data.url);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Gagal mengunggah logo");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan saat mengunggah logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (!targetSekolahId) {
    return (
      <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🏫</div>
        <h3 style={{ marginBottom: "8px" }}>Pilih Sekolah Terlebih Dahulu</h3>
        <p style={{ color: "var(--text-muted)" }}>Gunakan menu pencarian sekolah di bagian atas untuk memilih sekolah yang akan dikelola.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
        <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>Manajemen Sekolah</h4>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveMenu("identitas")}
            className={`btn ${activeMenu === "identitas" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "8px" }}
          >
            🏫 Identitas Sekolah
          </button>
          <button
            onClick={() => setActiveMenu("bank_data")}
            className={`btn ${activeMenu === "bank_data" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "8px" }}
          >
            📂 Bank Data Siswa
          </button>
          <button
            onClick={() => setActiveMenu("ekskul")}
            className={`btn ${activeMenu === "ekskul" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "8px" }}
          >
            🏅 Ekstrakurikuler
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 0" }}>
        {activeMenu === "identitas" && (
          <div>
            <h5 style={{ marginBottom: "16px", fontWeight: "700" }}>Identitas Sekolah</h5>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Memuat data...</div>
            ) : (
              <form onSubmit={handleSaveIdentitas} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {successMsg && (
                  <div style={{ padding: "12px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success)", borderRadius: "8px", fontSize: "0.9rem" }}>
                    {successMsg}
                  </div>
                )}
                {errorMsg && (
                  <div style={{ padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: "8px", fontSize: "0.9rem" }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "8px", border: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
                    <img 
                      src={logoUrl || `https://ffrucebdhhrpkuszlshy.supabase.co/storage/v1/object/public/logos/${targetSekolahId}.png?t=${logoVersion}`} 
                      alt="Logo Sekolah" 
                      style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
                      onLoad={(e) => { e.currentTarget.style.display = 'block'; e.currentTarget.nextSibling.style.display = 'none'; }}
                    />
                    <div style={{ display: "none", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>Tanpa Logo</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: "0 0 8px 0", fontSize: "0.95rem" }}>Logo Sekolah (E-Rapor)</h6>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      style={{ fontSize: "0.85rem" }}
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo && <span style={{ fontSize: "0.8rem", marginLeft: "10px", color: "var(--primary)" }}>Mengunggah...</span>}
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>Format disarankan: PNG dengan latar belakang transparan.</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Nama Sekolah</label>
                    <input type="text" className="form-input" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>NPSN</label>
                    <input type="text" className="form-input" value={formData.npsn} onChange={(e) => setFormData({...formData, npsn: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Alamat Lengkap</label>
                    <input type="text" className="form-input" value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Kode Pos</label>
                    <input type="text" className="form-input" value={formData.kode_pos} onChange={(e) => setFormData({...formData, kode_pos: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Desa / Kelurahan</label>
                    <input type="text" className="form-input" value={formData.desa_kelurahan} onChange={(e) => setFormData({...formData, desa_kelurahan: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Kecamatan</label>
                    <input type="text" className="form-input" value={formData.kecamatan} onChange={(e) => setFormData({...formData, kecamatan: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Kabupaten / Kota</label>
                    <input type="text" className="form-input" value={formData.kabupaten_kota} onChange={(e) => setFormData({...formData, kabupaten_kota: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Provinsi</label>
                    <input type="text" className="form-input" value={formData.provinsi} onChange={(e) => setFormData({...formData, provinsi: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Website</label>
                    <input type="text" className="form-input" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>Email Sekolah</label>
                    <input type="text" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Identitas Sekolah"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeMenu === "bank_data" && (
          <div style={{ border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
            <BankDataPanel targetSekolahId={targetSekolahId} />
          </div>
        )}

        {activeMenu === "ekskul" && (
          <div style={{ border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
            <EkskulAdminPanel targetSekolahId={targetSekolahId} />
          </div>
        )}
      </div>
    </div>
  );
}
