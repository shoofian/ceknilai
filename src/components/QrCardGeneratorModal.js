"use client";

import React, { useState, useEffect, useRef } from "react";
import { zipSync } from "fflate";
import html2canvas from "html2canvas";

export default function QrCardGeneratorModal({ isOpen, onClose, kelas }) {
  const [selectedSiswa, setSelectedSiswa] = useState([]);
  const [exportType, setExportType] = useState("zip"); // 'zip' (ZIP files) or 'print' (A4 grid print)
  const [cardStyle, setCardStyle] = useState("card"); // 'card' (ready-to-print card) or 'qr-only' (only QR code)
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const containerRef = useRef(null);

  // Initialize selected list with all students in the class
  useEffect(() => {
    if (kelas?.siswa) {
      setSelectedSiswa(kelas.siswa.map(s => s.nisn));
    }
  }, [kelas, isOpen]);

  if (!isOpen || !kelas) return null;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedSiswa(kelas.siswa.map(s => s.nisn));
    } else {
      setSelectedSiswa([]);
    }
  };

  const handleToggleSiswa = (nisn) => {
    setSelectedSiswa(prev => 
      prev.includes(nisn) ? prev.filter(id => id !== nisn) : [...prev, nisn]
    );
  };

  const handleStartExport = async () => {
    if (selectedSiswa.length === 0) {
      alert("Pilih minimal 1 siswa untuk dicetak!");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setTotalToGenerate(selectedSiswa.length);

    const targetStudents = kelas.siswa.filter(s => selectedSiswa.includes(s.nisn));

    if (exportType === "zip") {
      try {
        const zipData = {};
        
        for (let i = 0; i < targetStudents.length; i++) {
          const student = targetStudents[i];
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${student.nisn}`;
          
          if (cardStyle === "qr-only") {
            // Fetch raw QR image blob and convert to array buffer
            const res = await fetch(qrUrl);
            if (!res.ok) throw new Error(`Gagal mengunduh QR Code untuk ${student.nama}`);
            const buf = await res.arrayBuffer();
            zipData[`${student.nisn}.png`] = new Uint8Array(buf);
          } else {
            // Create temporary DOM element for Card Rendering
            const cardEl = document.createElement("div");
            cardEl.style.width = "350px";
            cardEl.style.height = "220px";
            cardEl.style.padding = "16px";
            cardEl.style.borderRadius = "12px";
            cardEl.style.background = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
            cardEl.style.color = "#f8fafc";
            cardEl.style.fontFamily = "sans-serif";
            cardEl.style.display = "flex";
            cardEl.style.flexDirection = "column";
            cardEl.style.justifyContent = "space-between";
            cardEl.style.boxSizing = "border-box";
            cardEl.style.position = "fixed";
            cardEl.style.top = "-9999px";
            cardEl.style.left = "-9999px";
            cardEl.style.border = "1px solid rgba(255,255,255,0.08)";
            cardEl.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.3)";

            cardEl.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <div>
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.05em;">Kartu Presensi Siswa</div>
                  <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 2px; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${kelas.nama}
                  </div>
                </div>
                <div style="font-size: 12px;">📚</div>
              </div>
              <div style="display: flex; gap: 12px; align-items: center; margin: 12px 0;">
                <div style="background: white; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; width: 88px; height: 88px; box-sizing: border-box;">
                  <img src="${qrUrl}" style="width: 80px; height: 80px;" crossorigin="anonymous" />
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; flex: 1;">
                  <div style="font-size: 13px; font-weight: 800; color: #ffffff; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${student.nama}">
                    ${student.nama}
                  </div>
                  <div style="font-size: 11px; font-family: monospace; color: #60a5fa; font-weight: 700;">
                    NISN: ${student.nisn}
                  </div>
                  <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">
                    Tahun Ajaran: ${kelas.tahunAjaran || "-"}
                  </div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; font-size: 8px; color: #64748b; font-weight: 600;">
                <span>CekNilai.com • Smart Grading App</span>
                <span>Scan untuk Absen</span>
              </div>
            `;

            document.body.appendChild(cardEl);

            // Wait briefly for image inside HTML to load
            await new Promise(resolve => setTimeout(resolve, 350));

            // Convert HTML to Canvas
            const canvas = await html2canvas(cardEl, {
              useCORS: true,
              scale: 2, // Double resolution for crystal clear print quality
              backgroundColor: null
            });

            document.body.removeChild(cardEl);

            // Convert canvas to base64 buffer
            const dataUrl = canvas.toDataURL("image/png");
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let j = 0; j < len; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }

            zipData[`${student.nisn}.png`] = bytes;
          }

          setProgress(i + 1);
        }

        // Create Zip
        const zipped = zipSync(zipData);
        const blob = new Blob([zipped], { type: "application/zip" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `KARTU_QR_${kelas.nama.replace(/\s+/g, "_").toUpperCase()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (err) {
        console.error("ZIP Generation error:", err);
        alert("Gagal mengunduh kartu QR. Silakan periksa koneksi internet Anda.");
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Print grid layout
      setIsGenerating(false);
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up diblokir! Izinkan pop-up untuk mencetak kartu QR.");
        return;
      }

      const cardsHtml = targetStudents.map(student => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${student.nisn}`;
        if (cardStyle === "qr-only") {
          return `
            <div class="qr-only-box">
              <img src="${qrUrl}" crossorigin="anonymous" />
              <div class="student-label">
                <strong>${student.nama}</strong><br>
                <span>NISN: ${student.nisn}</span>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="print-card">
              <div class="card-header">
                <div>
                  <div class="card-subtitle">Kartu Presensi Siswa</div>
                  <div class="class-title">${kelas.nama}</div>
                </div>
                <div style="font-size: 14px;">🎓</div>
              </div>
              <div class="card-body">
                <div class="qr-container">
                  <img src="${qrUrl}" crossorigin="anonymous" />
                </div>
                <div class="info-container">
                  <div class="student-name">${student.nama}</div>
                  <div class="student-nisn">NISN: ${student.nisn}</div>
                  <div class="class-meta">Tahun Ajaran: ${kelas.tahunAjaran || "-"}</div>
                </div>
              </div>
              <div class="card-footer">
                <span>CekNilai.com • Smart Grading App</span>
                <span>Scan untuk Absen</span>
              </div>
            </div>
          `;
        }
      }).join("");

      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Kartu QR Presensi - ${kelas.nama}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              body {
                font-family: 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 0;
                background: white;
                color: #1e293b;
              }
              .print-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                box-sizing: border-box;
              }
              
              /* Style Kartu Keren */
              .print-card {
                width: 100%;
                height: 220px;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                color: #f8fafc;
                padding: 16px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-inside: avoid;
              }
              .card-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                border-bottom: 1px solid rgba(255,255,255,0.15);
                padding-bottom: 8px;
              }
              .card-subtitle {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                color: #3b82f6;
                letter-spacing: 0.05em;
              }
              .class-title {
                font-size: 11px;
                font-weight: 700;
                color: #94a3b8;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 220px;
              }
              .card-body {
                display: flex;
                gap: 12px;
                align-items: center;
                margin: 12px 0;
              }
              .qr-container {
                background: white;
                padding: 4px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 86px;
                height: 86px;
                box-sizing: border-box;
              }
              .qr-container img {
                width: 78px;
                height: 78px;
              }
              .info-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
                overflow: hidden;
                flex: 1;
              }
              .student-name {
                font-size: 13px;
                font-weight: 800;
                color: #ffffff;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .student-nisn {
                font-size: 11px;
                font-family: monospace;
                color: #60a5fa;
                font-weight: 700;
              }
              .class-meta {
                font-size: 9px;
                color: #94a3b8;
                margin-top: 2px;
              }
              .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid rgba(255,255,255,0.08);
                padding-top: 6px;
                font-size: 8px;
                color: #64748b;
                font-weight: 600;
              }

              /* Style Hanya QR */
              .qr-only-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                box-sizing: border-box;
              }
              .qr-only-box {
                border: 1px dashed #cbd5e1;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                page-break-inside: avoid;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
              }
              .qr-only-box img {
                width: 120px;
                height: 120px;
                margin-bottom: 8px;
              }
              .student-label {
                font-size: 10px;
                color: #334155;
              }
            </style>
          </head>
          <body>
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;" class="no-print">
              <div>
                <h3 style="margin: 0; color: #0f172a;">Lembaran Cetak QR Presensi</h3>
                <span style="font-size: 12px; color: #64748b;">Kelas: ${kelas.nama} • Jumlah: ${targetStudents.length} siswa</span>
              </div>
              <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">🖨️ Mulai Cetak Lembaran</button>
            </div>
            <div class="${cardStyle === 'qr-only' ? 'qr-only-grid' : 'print-grid'}">
              ${cardsHtml}
            </div>
            <script>
              // Auto trigger print dialog on page load
              window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
      <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "650px", display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.3rem" }}>📇</span>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Cetak Kartu / QR Code Siswa</h3>
          </div>
          <button onClick={onClose} disabled={isGenerating} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
        </div>

        {isGenerating ? (
          /* Processing screen */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "16px" }}>
            <span className="spinner" style={{ width: "40px", height: "40px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: "800", color: "var(--text-primary)" }}>Mengekspor Kartu QR...</p>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Memproses {progress} dari {totalToGenerate} kartu
              </p>
            </div>
            <div style={{ width: "100%", maxWidth: "300px", height: "6px", backgroundColor: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${(progress / totalToGenerate) * 100}%`, height: "100%", backgroundColor: "var(--primary)", transition: "width 0.2s" }} />
            </div>
          </div>
        ) : (
          /* Main Config view */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Split layout: Option selectors (left) + student list (right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              
              {/* Left Column: Export Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>1. Metode Ekspor</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={exportType === "zip"} onChange={() => setExportType("zip")} />
                      💾 Download ZIP (File Gambar per NISN)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={exportType === "print"} onChange={() => setExportType("print")} />
                      🖨️ Cetak Lembaran A4 (Grid Siap Potong)
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>2. Desain Output</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={cardStyle === "card"} onChange={() => setCardStyle("card")} />
                      📇 Kartu Presensi Keren (Siap Cetak)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={cardStyle === "qr-only"} onChange={() => setCardStyle("qr-only")} />
                      🏁 Hanya Gambar QR Code
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)", padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  📌 <strong>Catatan:</strong> Nama file hasil ZIP akan menggunakan format <code>[NISN].png</code> untuk mempermudah integrasi sistem atau pencarian berkas.
                </div>
              </div>

              {/* Right Column: Student Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)" }}>3. Pilih Siswa ({selectedSiswa.length})</label>
                  <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "var(--primary)", fontWeight: "600" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedSiswa.length === kelas.siswa.length}
                      onChange={(e) => handleSelectAll(e.target.checked)} 
                    />
                    Semua
                  </label>
                </div>

                <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", height: "200px", overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {kelas.siswa.map(s => (
                    <label 
                      key={s.nisn} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px", 
                        fontSize: "0.8rem", 
                        padding: "4px 6px", 
                        borderRadius: "4px", 
                        cursor: "pointer",
                        backgroundColor: selectedSiswa.includes(s.nisn) ? "var(--bg-secondary)" : "transparent"
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedSiswa.includes(s.nisn)} 
                        onChange={() => handleToggleSiswa(s.nisn)}
                      />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>{s.nama}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContext: "end", gap: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "8px" }}>
              <button onClick={onClose} className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>Batal</button>
              <button 
                onClick={handleStartExport} 
                className="btn btn-primary" 
                style={{ fontSize: "0.85rem", padding: "8px 20px" }}
              >
                {exportType === "zip" ? "💾 Download ZIP Berkas" : "🖨️ Proses Cetak Lembaran"}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
