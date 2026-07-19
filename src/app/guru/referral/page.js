"use client";

import { useState, useEffect } from 'react';

export default function ReferralPage() {
  const [data, setData] = useState({
    balance: 0,
    history: [],
    isFirstPaymentClaimed: false,
    referralCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form states
  const [paket, setPaket] = useState('bulanan');
  // Structured payment form fields
  const [namaGuru, setNamaGuru] = useState('');
  const [namaBank, setNamaBank] = useState('');
  const [nomorRekening, setNomorRekening] = useState('');
  const [tanggalTransfer, setTanggalTransfer] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [redeemingId, setRedeemingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedBank, setCopiedBank] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

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
        setError(errJson.error || 'Gagal memuat data referral');
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

  const handleCopyCode = () => {
    if (!data.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!namaGuru.trim() || !namaBank.trim() || !nomorRekening.trim() || !tanggalTransfer) {
      alert('Mohon lengkapi semua kolom yang wajib diisi.');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    setSuccessMsg('');

    // Build structured proof string from individual fields
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

  const handleRedeem = async (rewardId, rewardName, price) => {
    if (data.balance < price) {
      alert(`Poin Anda tidak mencukupi untuk menukar "${rewardName}".`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menukar ${price} poin untuk "${rewardName}"?`)) {
      return;
    }

    setRedeemingId(rewardId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/referral/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal melakukan penukaran poin');
      }

      setSuccessMsg(json.message);
      fetchReferralData();
    } catch (err) {
      setError(err.message || 'Gagal menukarkan poin.');
    } finally {
      setRedeemingId(null);
    }
  };

  const rewardList = [
    { id: 'free_1m', name: '🎁 Gratis 1 Bulan Premium', price: 130, desc: 'Perpanjang masa aktif akun premium CekNilai selama 1 bulan penuh.' },
    { id: 'free_12m', name: '👑 Gratis 1 Tahun Premium', price: 1060, desc: 'Akses penuh premium selama setahun penuh. Hadiah terbaik untuk guru setia.' },
    { id: 'cash_1m', name: '💵 Uang Tunai Rp 1.000.000', price: 6500, desc: 'Tukarkan poin Anda dengan uang tunai Rp 1.000.000 (ditransfer langsung ke rekening bank Anda setelah divalidasi admin).' }
  ];

  if (loading && data.referralCode === '') {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Memuat data poin & referral...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Title & Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>🎁 Program Referral & Poin</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Undang rekan guru lain menggunakan CekNilai, kumpulkan poin, dan klaim hadiah premium secara gratis!
          </p>
        </div>
        <button 
          onClick={() => setRulesOpen(true)}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '600' }}
        >
          💡 Ketentuan Program
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', fontSize: '0.85rem' }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Points Display Card */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
            borderRadius: '16px', 
            padding: '24px', 
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.25)',
            minHeight: '160px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background pattern */}
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '6rem', opacity: 0.15, pointerEvents: 'none' }}>🎁</div>
          <div>
            <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: '700' }}>Poin Saya</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              {data.balance}
              <span style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.9 }}>POIN</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.85, margin: '12px 0 0 0', lineHeight: 1.4 }}>
            Klaim poin saat rekan Anda bergabung, tukarkan dengan gratis akses langganan premium bulanan atau tahunan.
          </p>
        </div>

        {/* Copy Referral Code Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', minHeight: '160px' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>🔗 Kode Referral Saya</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
              Bagikan kode unik Anda kepada rekan guru lain agar mereka dapat menggunakannya saat konfirmasi pembayaran pertama mereka.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <div 
              style={{ 
                flex: 1, 
                backgroundColor: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                fontFamily: 'monospace', 
                fontSize: '1rem', 
                fontWeight: '800', 
                display: 'flex', 
                alignItems: 'center',
                color: 'var(--text-primary)'
              }}
            >
              {data.referralCode}
            </div>
            <button 
              onClick={handleCopyCode} 
              className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
              style={{ padding: '0 20px', minWidth: '95px', fontSize: '0.85rem' }}
            >
              {copied ? 'Tersalin!' : '📋 Salin'}
            </button>
          </div>
        </div>

      </div>

      {/* Rules Modal */}
      {rulesOpen && (
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
          <div className="glass-card modal-content-scroll" style={{ width: "100%", maxWidth: "500px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>
                💡 Ketentuan Program Rekomendasi
              </h3>
              <button 
                onClick={() => setRulesOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Selamat datang di Program Referral CekNilai! Dapatkan keuntungan bersama rekan guru Anda dengan mengikuti aturan berikut:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <strong>Keuntungan Bersama</strong>: Kedua guru (pemberi & penerima kode) akan sama-sama mendapatkan poin setelah transaksi pembayaran pertama sukses diverifikasi oleh admin.
                </li>
                <li>
                  <strong>Poin Berdasarkan Paket</strong>:
                  <ul style={{ paddingLeft: '20px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <li>🚀 <strong>Paket Langganan Tahunan (Rp 159.000)</strong>: Mendapatkan <strong>100 Poin</strong> untuk masing-masing guru.</li>
                    <li>📦 <strong>Paket Langganan Bulanan (Rp 19.000)</strong>: Mendapatkan <strong>10 Poin</strong> untuk masing-masing guru.</li>
                  </ul>
                </li>
                <li>
                  <strong>Batas Klaim Kode</strong>: Setiap guru yang baru terdaftar hanya diperbolehkan mengklaim kode rekomendasi <strong>sekali saja</strong> pada saat melakukan konfirmasi pembayaran pertama mereka.
                </li>
                <li>
                  <strong>Kemandirian Kode</strong>: Anda tidak diperbolehkan memasukkan atau mengklaim kode referral milik Anda sendiri.
                </li>
                <li>
                  <strong>Akumulasi Poin</strong>: Poin Anda tidak akan pernah hangus dan dapat ditukarkan kapan saja dengan hadiah premium di tabel penukaran.
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setRulesOpen(false)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Payment Form & Gift Redeem Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Payment Confirmation Section — Full Redesign */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header */}
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>💳 Langganan & Konfirmasi Pembayaran</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              Ikuti 3 langkah mudah di bawah ini untuk mengaktifkan akun premium Anda.
            </p>
          </div>

          {/* STEP 1: Pilih Paket */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Pilih Paket Langganan</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Bulanan */}
              <div
                onClick={() => setPaket('bulanan')}
                style={{
                  border: paket === 'bulanan' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'bulanan' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'bulanan' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff' }}>✓</div>}
                <div style={{ fontSize: '1.3rem', marginBottom: '6px' }}>📦</div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>Bulanan</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>Rp 19.000</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>per bulan</div>
              </div>
              {/* Tahunan */}
              <div
                onClick={() => setPaket('tahunan')}
                style={{
                  border: paket === 'tahunan' ? '2px solid #eab308' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '14px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'tahunan' ? 'rgba(234,179,8,0.08)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'tahunan' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#000' }}>✓</div>}
                <div style={{ position: 'absolute', top: '0', left: '0', backgroundColor: '#eab308', color: '#000', fontSize: '0.55rem', fontWeight: '800', padding: '2px 8px', borderRadius: '12px 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hemat 30%</div>
                <div style={{ fontSize: '1.3rem', marginBottom: '6px', marginTop: '6px' }}>👑</div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>Tahunan</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#eab308', marginTop: '4px' }}>Rp 159.000</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>per tahun · +100 Poin Referral</div>
              </div>
            </div>
          </div>

          {/* STEP 2: Transfer ke Rekening */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Transfer ke Rekening Berikut</span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {/* Bank row */}
              {[{ label: '⚪ Bank BRI', value: '343601002122509', sub: 'a.n. Wahyu Shofian' }, { label: '🔵 BPD Kaltimtara', value: '0068360137', sub: 'a.n. Wahyu Shofian' }, { label: '🟡 Bank Jago', value: '105853689778', sub: 'a.n. Wahyu Shofian' }].map((bank, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem' }}>{bank.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '800', letterSpacing: '1px', marginTop: '2px' }}>{bank.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{bank.sub}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(bank.value); setCopiedBank(bank.value); setTimeout(() => setCopiedBank(''), 2000); }}
                    className={`btn ${copiedBank === bank.value ? 'btn-success' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.72rem', flexShrink: 0 }}
                  >
                    {copiedBank === bank.value ? '✓ Tersalin' : '📋 Salin'}
                  </button>
                </div>
              ))}
              <div style={{ padding: '10px 16px', backgroundColor: 'rgba(99,102,241,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--primary)' }}>
                  Nominal: {paket === 'tahunan' ? 'Rp 159.000' : 'Rp 19.000'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>— Transfer sesuai paket yang dipilih</span>
              </div>
            </div>
          </div>

          {/* STEP 3: Isi Form Konfirmasi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Kirim Konfirmasi Pembayaran</span>
            </div>
            
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="btn btn-primary animate-pulse"
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '4px',
                fontWeight: '700',
                fontSize: '0.92rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                color: '#ffffff'
              }}
            >
              ✉️ Kirim Konfirmasi Pembayaran &rarr;
            </button>
          </div>

        </div>

        {/* Gift Redeem Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>🎁 Penukaran Hadiah Premium</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Kumpulkan poin Anda dan tukarkan langsung dengan reward masa pakai gratis atau merchandise eksklusif.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {rewardList.map((reward) => {
              const progressPercent = Math.min(100, Math.round((data.balance / reward.price) * 100));
              const isEligible = data.balance >= reward.price;
              
              // Define custom styles for each reward card type to look extremely premium
              let badgeBg = 'var(--bg-tertiary)';
              let badgeColor = 'var(--text-muted)';
              let statusLabel = `🚀 Kumpulkan ${reward.price - data.balance} Poin Lagi`;
              let statusBg = 'rgba(245, 158, 11, 0.1)';
              let statusColor = 'var(--warning)';

              if (isEligible) {
                badgeBg = 'rgba(16, 185, 129, 0.1)';
                badgeColor = 'var(--success)';
                statusLabel = '✨ Siap Ditukar';
                statusBg = 'rgba(16, 185, 129, 0.15)';
                statusColor = 'var(--success)';
              }

              // Card themes based on value
              let cardBg = 'var(--bg-secondary)';
              let iconEmoji = '🎁';
              let themeColor = 'var(--primary)';

              if (reward.id === 'free_1m') {
                iconEmoji = '⚡';
                themeColor = '#10b981'; // Emerald
              } else if (reward.id === 'free_3m') {
                iconEmoji = '🔥';
                themeColor = '#f97316'; // Orange
              } else if (reward.id === 'free_12m') {
                iconEmoji = '👑';
                themeColor = '#eab308'; // Gold
                cardBg = 'linear-gradient(to bottom right, var(--bg-secondary), rgba(234, 179, 8, 0.03))';
              } else if (reward.id === 'cash_1m') {
                iconEmoji = '💵';
                themeColor = '#8b5cf6'; // Purple
              }

              return (
                <div 
                  key={reward.id} 
                  className="glass-card animate-fade-in" 
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '14px',
                    border: isEligible ? `1px solid ${themeColor}40` : '1px solid var(--border-color)',
                    background: cardBg,
                    boxShadow: isEligible ? `0 8px 24px ${themeColor}12` : 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  
                  {/* Popular / Best value flags */}
                  {reward.id === 'free_3m' && (
                    <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#f97316', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '4px 12px', borderBottomLeftRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔥 Populer
                    </div>
                  )}
                  {reward.id === 'free_12m' && (
                    <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#eab308', color: '#000', fontSize: '0.65rem', fontWeight: '800', padding: '4px 12px', borderBottomLeftRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      👑 Terbaik
                    </div>
                  )}

                  {/* Header info */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div 
                      style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '12px', 
                        backgroundColor: isEligible ? `${themeColor}20` : 'var(--bg-tertiary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1.4rem',
                        border: `1px solid ${isEligible ? themeColor + '30' : 'var(--border-color)'}`,
                        flexShrink: 0
                      }}
                    >
                      {iconEmoji}
                    </div>

                    <div style={{ flex: 1, paddingRight: reward.id === 'free_3m' || reward.id === 'free_12m' ? '80px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <h5 style={{ margin: 0, fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{reward.name.split(' ').slice(1).join(' ')}</h5>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: themeColor }}>
                          ({reward.price} Poin)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                        {reward.desc}
                      </p>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: '600' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Progres Poin:</span>
                      <span style={{ color: isEligible ? 'var(--success)' : 'var(--text-primary)' }}>
                        {data.balance} / {reward.price} Poin ({progressPercent}%)
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div 
                        style={{ 
                          width: `${progressPercent}%`, 
                          height: '100%', 
                          background: isEligible 
                            ? 'linear-gradient(90deg, #10b981, #34d399)' 
                            : `linear-gradient(90deg, var(--primary), ${themeColor})`, 
                          borderRadius: '99px',
                          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} 
                      />
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '10px' }}>
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        backgroundColor: statusBg, 
                        color: statusColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {statusLabel}
                    </span>

                    <button 
                      onClick={() => handleRedeem(reward.id, reward.name, reward.price)}
                      className={`btn ${isEligible ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '0.78rem', 
                        minWidth: '110px',
                        boxShadow: isEligible ? `0 4px 12px ${themeColor}30` : 'none',
                        fontWeight: '700'
                      }}
                      disabled={!isEligible || redeemingId !== null}
                    >
                      {redeemingId === reward.id ? 'Memproses...' : isEligible ? '⚡ Tukar Sekarang' : 'Poin Belum Cukup'}
                    </button>
                  </div>

                </div>
              );
            })}

            {/* Upcoming Reward Card */}
            <div 
              className="glass-card animate-fade-in" 
              style={{ 
                padding: '16px 20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                border: '1px dashed var(--border-color)',
                background: 'rgba(255, 255, 255, 0.01)',
                opacity: 0.8
              }}
            >
              <div 
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '10px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '1.2rem',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border-color)',
                  flexShrink: 0
                }}
              >
                ⏳
              </div>
              <div>
                <h5 style={{ margin: 0, fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Hadiah Lain Segera Datang</h5>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                  Kami sedang menyiapkan berbagai merchandise dan reward menarik lainnya untuk Anda!
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Points History Log Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 16px 0' }}>📋 Riwayat Poin</h4>
        
        <div style={{ overflowX: 'auto' }}>
          {data.history.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada riwayat transaksi poin masuk atau keluar.
            </div>
          ) : (
            <table className="premium-table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Tanggal</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Jumlah</th>
                  <th style={{ width: '65%' }}>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.78rem' }}>
                      {new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(log.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: log.points > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                      {log.points > 0 ? `+${log.points}` : log.points}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
            padding: '28px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  ✉️ Konfirmasi Pembayaran
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Konfirmasi pembayaran untuk paket: <strong style={{ color: paket === 'tahunan' ? '#eab308' : 'var(--primary)' }}>{paket === 'tahunan' ? '👑 Paket Tahunan (Rp 159.000)' : '📦 Paket Bulanan (Rp 19.000)'}</strong>
                </p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: '1',
                  marginTop: '-4px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Lengkap Pengirim <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Budi Santoso"
                  value={namaGuru}
                  onChange={(e) => setNamaGuru(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bank Asal Transfer <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                  <label className="form-label">No. HP Pengirim <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: 081234567890"
                    value={nomorRekening}
                    onChange={(e) => setNomorRekening(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Tanggal & Waktu Transfer <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <span 
                    onClick={setTodayDateTime} 
                    style={{ 
                      color: 'var(--primary)', 
                      cursor: 'pointer', 
                      fontSize: '0.72rem', 
                      fontWeight: '700', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      backgroundColor: 'var(--primary-glow)', 
                      padding: '2px 8px', 
                      borderRadius: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    title="Set ke tanggal & waktu saat ini"
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
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Kode Referral Rekan Guru <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>(Opsional)</span></span>
                  {data.isFirstPaymentClaimed && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 'bold' }}>⚠️ Sudah diklaim</span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Username guru yang merekomendasikan (misal: budi_guru)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  disabled={data.isFirstPaymentClaimed}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  * Hanya berlaku satu kali pada pembayaran pertama. Kosongkan jika tidak ada.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px', fontWeight: '700' }}
                  disabled={submittingPayment}
                >
                  {submittingPayment ? '⏳ Memproses...' : '✉️ Kirim Konfirmasi'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
