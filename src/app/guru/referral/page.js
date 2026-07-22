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
    { id: 'free_1m', name: 'Gratis 1 Bulan Premium', price: 130, icon: '⚡' },
    { id: 'free_12m', name: 'Gratis 1 Tahun Premium', price: 1060, icon: '👑', badge: 'Terbaik' },
    { id: 'cash_1m', name: 'Uang Tunai Rp 1.000.000', price: 6500, icon: '💵' }
  ];

  if (loading && data.referralCode === '') {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>👑 Masa Aktif & Referral</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px', margin: 0 }}>
            Kelola paket langganan, bagikan kode referral, dan tukarkan poin.
          </p>
        </div>
        <button 
          onClick={() => setRulesOpen(true)}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '600' }}
        >
          💡 Ketentuan
        </button>
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

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Points Display Card */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            borderRadius: '14px', 
            padding: '20px', 
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4.5rem', opacity: 0.15, pointerEvents: 'none' }}>🎁</div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.85, fontWeight: '700' }}>Poin Saya</span>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {data.balance}
            <span style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>POIN</span>
          </div>
        </div>

        {/* Copy Referral Code Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', fontWeight: '700' }}>🔗 Kode Referral Saya</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div 
              style={{ 
                flex: 1, 
                backgroundColor: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '8px 12px', 
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
              style={{ padding: '0 16px', fontSize: '0.8rem', fontWeight: '700' }}
            >
              {copied ? 'Tersalin!' : '📋 Salin'}
            </button>
          </div>
        </div>

        {/* Masa Aktif Premium Card */}
        <div 
          className="glass-card" 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            padding: '20px', 
            gap: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', fontWeight: '700' }}>👑 Status Masa Aktif</span>
          <div>
            {data.premiumUntil ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  fontSize: '0.75rem', 
                  fontWeight: '800', 
                  color: new Date(data.premiumUntil) > new Date() ? 'var(--success)' : 'var(--danger)',
                  backgroundColor: new Date(data.premiumUntil) > new Date() ? 'var(--success-glow)' : 'var(--danger-glow)',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  {new Date(data.premiumUntil) > new Date() ? '● PREMIUM AKTIF' : '● EXPIRED'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  s/d {new Date(data.premiumUntil).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ) : (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                fontSize: '0.75rem', 
                fontWeight: '800', 
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '4px 10px',
                borderRadius: '20px'
              }}>
                ● BELUM AKTIF
              </span>
            )}
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
          <div className="glass-card modal-content-scroll" style={{ width: "100%", maxWidth: "480px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", margin: 0 }}>
                💡 Ketentuan Program
              </h3>
              <button 
                onClick={() => setRulesOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Bonus Poin</strong>: Diberikan kepada pemberi & penerima kode setelah pembayaran pertama terverifikasi.</li>
                <li><strong>Skema Poin</strong>: Paket Tahunan = <strong>100 Poin</strong>, Paket Bulanan = <strong>10 Poin</strong>.</li>
                <li><strong>Batas Klaim</strong>: Hanya dapat diklaim 1 kali pada pembayaran pertama. Tidak berlaku untuk akun sendiri.</li>
                <li><strong>Masa Berlaku Poin</strong>: Poin akumulatif dan tidak pernah hangus.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setRulesOpen(false)} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Activation & Redeem */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Payment Activation Section */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>💳 Aktivasi Paket Premium</h4>

          {/* STEP 1: Pilih Paket */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>1. Pilih Paket</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Bulanan */}
              <div
                onClick={() => setPaket('bulanan')}
                style={{
                  border: paket === 'bulanan' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'bulanan' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'bulanan' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#fff' }}>✓</div>}
                <div style={{ fontWeight: '800', fontSize: '0.85rem' }}>Bulanan</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary)', marginTop: '2px' }}>Rp 19.000</div>
              </div>
              {/* Tahunan */}
              <div
                onClick={() => setPaket('tahunan')}
                style={{
                  border: paket === 'tahunan' ? '2px solid #eab308' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  backgroundColor: paket === 'tahunan' ? 'rgba(234,179,8,0.08)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {paket === 'tahunan' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: '#000' }}>✓</div>}
                <div style={{ position: 'absolute', top: '0', left: '0', backgroundColor: '#eab308', color: '#000', fontSize: '0.5rem', fontWeight: '800', padding: '1px 6px', borderRadius: '10px 0 6px 0' }}>HEMAT 30%</div>
                <div style={{ fontWeight: '800', fontSize: '0.85rem', marginTop: '4px' }}>Tahunan</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#eab308', marginTop: '2px' }}>Rp 159.000</div>
              </div>
            </div>
          </div>

          {/* STEP 2: Transfer Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>2. Rekening Transfer</div>
            <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              {[{ label: 'BRI', value: '343601002122509' }, { label: 'BPD Kaltimtara', value: '0068360137' }, { label: 'Bank Jago', value: '105853689778' }].map((bank, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '0.78rem' }}>{bank.label}: </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: '800' }}>{bank.value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(bank.value); setCopiedBank(bank.value); setTimeout(() => setCopiedBank(''), 2000); }}
                    className={`btn ${copiedBank === bank.value ? 'btn-success' : 'btn-secondary'}`}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    {copiedBank === bank.value ? '✓' : 'Salin'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: Action */}
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '10px',
              fontWeight: '700',
              fontSize: '0.85rem',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ✉️ Konfirmasi Pembayaran ({paket === 'tahunan' ? 'Rp 159.000' : 'Rp 19.000'})
          </button>

        </div>

        {/* Gift Redeem Section */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>🎁 Tukar Poin Hadiah</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rewardList.map((reward) => {
              const progressPercent = Math.min(100, Math.round((data.balance / reward.price) * 100));
              const isEligible = data.balance >= reward.price;

              return (
                <div 
                  key={reward.id} 
                  style={{ 
                    padding: '14px', 
                    borderRadius: '10px',
                    border: isEligible ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative'
                  }}
                >
                  {reward.badge && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#eab308', color: '#000', fontSize: '0.55rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>
                      {reward.badge}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: reward.badge ? '50px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{reward.icon}</span>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{reward.name}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary)' }}>{reward.price} Poin</span>
                  </div>

                  {/* Progress & Redeem */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${progressPercent}%`, 
                          height: '100%', 
                          backgroundColor: isEligible ? 'var(--success)' : 'var(--primary)',
                          borderRadius: '99px'
                        }} 
                      />
                    </div>
                    <button 
                      onClick={() => handleRedeem(reward.id, reward.name, reward.price)}
                      className={`btn ${isEligible ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ 
                        padding: '4px 12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        minWidth: '70px'
                      }}
                      disabled={!isEligible || redeemingId !== null}
                    >
                      {redeemingId === reward.id ? '...' : isEligible ? 'Tukar' : `${data.balance}/${reward.price}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Points History Log Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 12px 0' }}>📋 Riwayat Poin</h4>
        
        <div style={{ overflowX: 'auto' }}>
          {data.history.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Belum ada riwayat poin.
            </div>
          ) : (
            <table className="premium-table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Tanggal</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Jumlah</th>
                  <th style={{ width: '60%' }}>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.78rem' }}>
                      {new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: log.points > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
                      {log.points > 0 ? `+${log.points}` : log.points}
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: '600' }}>
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
            {/* Modal Header */}
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

            {/* Modal Form */}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                  placeholder="Username guru perekomendasi (misal: budi_guru)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  disabled={data.isFirstPaymentClaimed}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
