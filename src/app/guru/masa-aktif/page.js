"use client";

import { useState, useEffect } from 'react';

export default function MasaAktifPage() {
  const [data, setData] = useState({
    premiumUntil: null,
    isFirstPaymentClaimed: false,
    hasPendingPayment: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form states
  const [paket, setPaket] = useState('tahunan');
  const [namaGuru, setNamaGuru] = useState('');
  const [namaBank, setNamaBank] = useState('');
  const [nomorRekening, setNomorRekening] = useState('');
  const [tanggalTransfer, setTanggalTransfer] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedBank, setCopiedBank] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null);

  const setTodayDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setTanggalTransfer(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/referral');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json();
        setError(errJson.error || 'Gagal memuat data');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!namaGuru.trim() || !namaBank.trim() || !nomorRekening.trim() || !tanggalTransfer) {
      alert('Mohon lengkapi semua kolom yang wajib diisi.');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    setSuccessMsg('');

    const harga = paket === 'tahunan' ? 'Rp 159.000' : 'Rp 19.000';
    const buktiTerstruktur = `Nama: ${namaGuru.trim()} | Bank: ${namaBank.trim()} | No. HP: ${nomorRekening.trim()} | Paket: ${paket.toUpperCase()} (${harga}) | Tanggal: ${tanggalTransfer}`;

    try {
      const res = await fetch('/api/auth/referral/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paket,
          bukti: buktiTerstruktur,
          referralCode: referralInput.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengirim konfirmasi pembayaran');
      }

      let successText = json.message || `Konfirmasi pembayaran paket ${paket.toUpperCase()} berhasil dikirim!`;
      if (json.referralQueued) {
        successText += ` Kode referral Anda sudah direkam dan poin akan dikreditkan otomatis setelah pembayaran diverifikasi admin.`;
      } else if (referralInput.trim() !== '' && json.referralError) {
        successText += ` Catatan kode referral: ${json.referralError}`;
      }

      // Auto download receipt as IMAGE (Canvas)
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = referralInput.trim() ? 480 : 450;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Helper to draw dashed line
      const drawDashedLine = (yPos) => {
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(20, yPos);
        ctx.lineTo(380, yPos);
        ctx.strokeStyle = '#999999';
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // Header
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.font = '900 24px "Courier New", Courier, monospace';
      ctx.fillText('CEKNILAI.ID', 200, 45);
      
      ctx.font = 'bold 15px "Courier New", Courier, monospace';
      ctx.fillText('BUKTI KONFIRMASI PEMBAYARAN', 200, 75);
      
      let y = 100;
      drawDashedLine(y);
      y += 30;

      // Body (Left aligned)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      const drawRow = (label, value) => {
        ctx.font = 'bold 14px "Courier New", Courier, monospace';
        ctx.fillText(label, 20, y);
        ctx.font = '14px "Courier New", Courier, monospace';
        
        let displayValue = value;
        if (displayValue.length > 22) {
          displayValue = displayValue.substring(0, 20) + '...';
        }
        ctx.fillText(displayValue, 150, y);
        y += 30;
      };

      drawRow('TANGGAL', tanggalTransfer.replace('T', ' '));
      drawRow('NAMA', namaGuru.trim());
      drawRow('BANK ASAL', namaBank.trim());
      drawRow('NO. REKENING', nomorRekening.trim());
      drawRow('PAKET', paket.toUpperCase());
      drawRow('NOMINAL', harga);
      if (referralInput.trim()) {
        drawRow('REFERRAL', referralInput.trim());
      }

      drawDashedLine(y);
      y += 30;

      // Footer
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Status: Menunggu Verifikasi', 200, y);
      y += 22;
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillStyle = '#b45309'; // Dark warning color
      ctx.fillText('(Akses 24 jam telah diberikan)', 200, y);
      y += 30;
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.fillText('Mohon simpan struk ini sebagai', 200, y);
      y += 18;
      ctx.fillText('bukti konfirmasi Anda.', 200, y);

      // Export and Download
      const imgUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgUrl;
      a.download = `Struk_CekNilai_${namaGuru.trim().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccessMsg(successText);
      setNamaGuru('');
      setNamaBank('');
      setNomorRekening('');
      setTanggalTransfer('');
      setReferralInput('');
      setPaymentModalOpen(false);
      fetchReferralData();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 className="page-title">👑 Masa Aktif Premium</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px', margin: 0 }}>
          Kelola paket langganan dan status aktivasi akun Anda.
        </p>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.82rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.82rem' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Masa Aktif Premium Card */}
      <div 
        className="glass-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '24px', 
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', fontWeight: '700' }}>👑 Status Masa Aktif</span>
          <button
            type="button"
            onClick={() => setInfoModal({
              title: "👑 Status Masa Aktif",
              text: "Status lisensi premium CekNilai untuk guru aktif. Silakan lakukan aktivasi paket atau perpanjang lisensi melalui form konfirmasi pembayaran."
            })}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: '800',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Penjelasan Masa Aktif"
          >
            ?
          </button>
        </div>
        <div>
          {data.premiumUntil ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                fontSize: '0.85rem', 
                fontWeight: '800', 
                color: new Date(data.premiumUntil) > new Date() ? 'var(--success)' : 'var(--danger)',
                backgroundColor: new Date(data.premiumUntil) > new Date() ? 'var(--success-glow)' : 'var(--danger-glow)',
                padding: '6px 12px',
                borderRadius: '20px'
              }}>
                {new Date(data.premiumUntil) > new Date() ? '● PREMIUM AKTIF' : '● EXPIRED'}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                s/d {new Date(data.premiumUntil).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              {data.hasPendingPayment && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: '0.78rem', 
                  fontWeight: '700', 
                  color: 'var(--warning)',
                  backgroundColor: 'var(--warning-glow)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(234, 179, 8, 0.2)'
                }}>
                  ⏳ Konfirmasi pembayaran pending verifikasi admin
                </span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                fontSize: '0.85rem', 
                fontWeight: '800', 
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '6px 12px',
                borderRadius: '20px'
              }}>
                ● BELUM AKTIF
              </span>
              {data.hasPendingPayment && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: '0.78rem', 
                  fontWeight: '700', 
                  color: 'var(--warning)',
                  backgroundColor: 'var(--warning-glow)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(234, 179, 8, 0.2)'
                }}>
                  ⏳ Konfirmasi pembayaran pending verifikasi admin
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Activation Section */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0 }}>💳 Aktivasi Paket Premium</h4>
            <button
              type="button"
              onClick={() => setInfoModal({
                title: "💳 Aktivasi Paket Premium",
                text: "Ikuti 3 langkah mudah: Pilih paket langganan yang Anda inginkan (Bulanan/Tahunan), lakukan transfer ke salah satu rekening bank tercantum, lalu kirimkan form konfirmasi pembayaran."
              })}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '800',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Penjelasan Aktivasi"
            >
              ?
            </button>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>3 Langkah Mudah Aktivasi Lisensi Premium</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'center' }}>
          {/* STEP 1: Pilih Paket */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>1. Pilih Paket</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Bulanan */}
              <div
                onClick={() => setPaket('bulanan')}
                style={{
                  border: paket === 'bulanan' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'bulanan' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'bulanan' && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff' }}>✓</div>}
                <div style={{ fontWeight: '800', fontSize: '0.82rem' }}>Bulanan</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>Rp 19.000</div>
              </div>
              {/* Tahunan */}
              <div
                onClick={() => setPaket('tahunan')}
                style={{
                  border: paket === 'tahunan' ? '2px solid #eab308' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '10px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'tahunan' ? 'rgba(234,179,8,0.08)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'tahunan' && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#000' }}>✓</div>}
                <div style={{ position: 'absolute', top: '0', left: '0', backgroundColor: '#eab308', color: '#000', fontSize: '0.45rem', fontWeight: '800', padding: '1px 4px', borderRadius: '10px 0 4px 0' }}>HEMAT 30%</div>
                <div style={{ fontWeight: '800', fontSize: '0.82rem', marginTop: '2px' }}>Tahunan</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#eab308', marginTop: '2px' }}>Rp 159.000</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>(setara Rp 13.250 / bulan)</div>
              </div>
            </div>
          </div>

          {/* STEP 2: Rekening Transfer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>2. Rekening Transfer</div>
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {[{ label: 'BRI', value: '343601002122509' }, { label: 'BPD Kaltimtara', value: '0068360137' }, { label: 'Bank Jago', value: '105853689778' }].map((bank, i) => (
                <div key={i} style={{ padding: '6px 10px', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '0.75rem' }}>{bank.label}: </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: '800' }}>{bank.value}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>a.n. Wahyu Shofian</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(bank.value); setCopiedBank(bank.value); setTimeout(() => setCopiedBank(''), 2000); }}
                    className={`btn ${copiedBank === bank.value ? 'btn-success' : 'btn-secondary'}`}
                    style={{ padding: '6px 10px', fontSize: '0.75rem', minHeight: '32px' }}
                  >
                    {copiedBank === bank.value ? '✓' : 'Salin'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: Action Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>3. Konfirmasi</div>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: '800',
                fontSize: '0.85rem',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              ✉️ Konfirmasi Pembayaran ({paket === 'tahunan' ? 'Rp 159.000' : 'Rp 19.000'})
            </button>
          </div>
        </div>
      </div>

      {/* Info Pop-up Modal */}
      {infoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: '20px', border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: "1.05rem", fontWeight: "800", margin: 0, color: 'var(--text-primary)' }}>
                {infoModal.title}
              </h4>
              <button 
                onClick={() => setInfoModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {infoModal.text}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setInfoModal(null)} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Modal Konfirmasi Pembayaran */}
      {paymentModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                ✉️ Form Konfirmasi Pembayaran
              </h4>
              <button
                onClick={() => setPaymentModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: '1'
                }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Paket terpilih: <strong style={{ color: paket === 'tahunan' ? '#eab308' : 'var(--primary)' }}>{paket === 'tahunan' ? 'Paket Tahunan (Rp 159.000)' : 'Paket Bulanan (Rp 19.000)'}</strong>
            </p>

            <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Nama Pengirim <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Budi Santoso"
                  value={namaGuru}
                  onChange={(e) => setNamaGuru(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Bank Asal <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className="form-input"
                    value={namaBank}
                    onChange={(e) => setNamaBank(e.target.value)}
                    required
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">Pilih bank...</option>
                    <option>BCA</option>
                    <option>Mandiri</option>
                    <option>BNI</option>
                    <option>BRI</option>
                    <option>BSI</option>
                    <option>DANA</option>
                    <option>OVO</option>
                    <option>GoPay</option>
                    <option>ShopeePay</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>No. HP Pengirim <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="081234567890"
                    value={nomorRekening}
                    onChange={(e) => setNomorRekening(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span>Waktu Transfer <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <span 
                    onClick={setTodayDateTime} 
                    style={{ 
                      color: 'var(--primary)', 
                      cursor: 'pointer', 
                      fontSize: '0.7rem', 
                      fontWeight: '700',
                      backgroundColor: 'var(--primary-glow)', 
                      padding: '2px 6px', 
                      borderRadius: '4px'
                    }}
                  >
                    ⚡ Hari Ini
                  </span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={tanggalTransfer}
                  onChange={(e) => setTanggalTransfer(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span>Kode Referral Guru <span style={{ color: 'var(--text-muted)' }}>(Opsional)</span></span>
                  {data.isFirstPaymentClaimed && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 'bold' }}>⚠️ Sudah diklaim</span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Username guru perekomendasi"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  disabled={data.isFirstPaymentClaimed}
                />
              </div>

              <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', padding: '10px', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Pemberitahuan:</strong> Setelah menekan kirim, Anda akan mendapatkan <strong>akses masa tenggang 24 jam</strong> secara instan agar bisa langsung menggunakan aplikasi sambil menunggu Superadmin memverifikasi pembayaran Anda.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '10px', fontWeight: '700', fontSize: '0.8rem' }}
                  disabled={submittingPayment}
                >
                  {submittingPayment ? 'Memproses...' : '✉️ Kirim Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
