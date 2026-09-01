"use client";

import { useState, useEffect } from 'react';

export default function HadiahReferralPage() {
  const [data, setData] = useState({
    balance: 0,
    history: [],
    referralCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [redeemingId, setRedeemingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [activeTheme, setActiveTheme] = useState('default');
  const [trialTheme, setTrialTheme] = useState(null);

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

    // Check ongoing trial preview
    try {
      const previewData = sessionStorage.getItem("theme_preview");
      if (previewData) {
        const parsed = JSON.parse(previewData);
        if (parsed && parsed.expiresAt > Date.now()) {
          setTrialTheme({
            ...parsed,
            timeLeft: Math.max(0, Math.floor((parsed.expiresAt - Date.now()) / 1000))
          });
        }
      }
    } catch (e) {}

    const savedColorTheme = localStorage.getItem("color_theme");
    if (savedColorTheme) {
      setActiveTheme(`theme_${savedColorTheme}`);
    } else {
      setActiveTheme('default');
    }
  }, []);

  // Timer tick for trial preview
  useEffect(() => {
    if (!trialTheme) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((trialTheme.expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        stopThemeTrial(true);
      } else {
        setTrialTheme(prev => prev ? { ...prev, timeLeft: remaining } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [trialTheme]);

  const startThemeTrial = (theme) => {
    const expiresAt = Date.now() + 1 * 60 * 1000; // 1 minute trial
    const trialData = {
      id: theme.id,
      name: theme.name,
      price: theme.price,
      expiresAt,
      timeLeft: 60
    };
    sessionStorage.setItem("theme_preview", JSON.stringify(trialData));
    const key = theme.id.replace('theme_', '');
    document.documentElement.setAttribute('data-theme', key);
    setTrialTheme(trialData);
    setSuccessMsg(`Mode Uji Coba 1 Menit diaktifkan untuk "${theme.name}". Selamat mencoba!`);
  };

  const stopThemeTrial = (isExpired = false) => {
    sessionStorage.removeItem("theme_preview");
    setTrialTheme(null);
    
    // Revert theme
    const savedColorTheme = localStorage.getItem("color_theme");
    if (savedColorTheme && savedColorTheme !== 'default') {
      document.documentElement.setAttribute("data-theme", savedColorTheme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    if (isExpired) {
      alert("Masa uji coba tema selama 1 menit telah berakhir.");
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor((seconds || 0) / 60);
    const s = (seconds || 0) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    if (!data.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isThemeUnlocked = (themeId) => {
    if (themeId === 'default') return true;
    let localUnlocked = [];
    try {
      localUnlocked = JSON.parse(localStorage.getItem('unlocked_themes') || '[]');
    } catch (e) {}
    if (localUnlocked.includes(themeId)) return true;

    if (data.history && data.history.length > 0) {
      const foundInLogs = data.history.some(log => 
        log.description && (
          log.description.includes(themeId) || 
          (themeId === 'theme_bw' && (log.description.includes('Black') || log.description.includes('Hitam'))) ||
          (themeId === 'theme_pastel' && log.description.includes('Pastel')) ||
          (themeId === 'theme_pinky' && log.description.includes('Pinky')) ||
          (themeId === 'theme_cool' && log.description.includes('Cool')) ||
          (themeId === 'theme_green' && log.description.includes('Mint')) ||
          (themeId === 'theme_gold' && log.description.includes('Royal Gold'))
        )
      );
      if (foundInLogs) return true;
    }
    return false;
  };

  const applyTheme = (themeId) => {
    if (trialTheme) {
      stopThemeTrial(false);
    }
    if (themeId === 'default') {
      localStorage.removeItem('color_theme');
      document.documentElement.removeAttribute('data-theme');
      setActiveTheme('default');
    } else {
      const key = themeId.replace('theme_', '');
      localStorage.setItem('color_theme', key);
      document.documentElement.setAttribute('data-theme', key);
      setActiveTheme(themeId);
    }
  };

  const handleRedeem = async (rewardId, rewardName, price) => {
    if (rewardId.startsWith('theme_') && isThemeUnlocked(rewardId)) {
      applyTheme(rewardId);
      setSuccessMsg(`Tema "${rewardName}" berhasil diterapkan!`);
      return;
    }

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

      if (trialTheme) {
        stopThemeTrial(false);
      }

      if (rewardId.startsWith('theme_')) {
        let localUnlocked = [];
        try {
          localUnlocked = JSON.parse(localStorage.getItem('unlocked_themes') || '[]');
        } catch (e) {}
        if (!localUnlocked.includes(rewardId)) {
          localUnlocked.push(rewardId);
          localStorage.setItem('unlocked_themes', JSON.stringify(localUnlocked));
        }
        applyTheme(rewardId);
      }

      setSuccessMsg(json.message);
      fetchReferralData();
    } catch (err) {
      setError(err.message || 'Gagal menukarkan poin.');
    } finally {
      setRedeemingId(null);
    }
  };

  const themeRewards = [
    { id: 'theme_bw', name: 'Black & White Noir', price: 40, icon: '🖤', color: '#475569', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', accentLabel: 'Noir Obsidian & High Contrast', badge: 'PRO NOIR', desc: 'Perubahan total ke monokrom obsidian noir dengan background dark contrast, aksen silver, dan atmosfer profesional yang tajam.' },
    { id: 'theme_pastel', name: 'Pastel Lavender', price: 40, icon: '🌸', color: '#8b5cf6', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(109, 40, 217, 0.2) 100%)', accentLabel: 'Velvet Violet & Amethyst Glow', desc: 'Atmosfer ungu lavender pastel dengan background velvet violet tint, pendaran amethyst glow, dan card border serba anggun.' },
    { id: 'theme_pinky', name: 'Sakura Pinky', price: 40, icon: '🎀', color: '#ec4899', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.4) 0%, rgba(190, 24, 93, 0.2) 100%)', accentLabel: 'Rose Sakura & Soft Blush', badge: 'POPULER', desc: 'Atmosfer sakura rose pink dengan background soft blush tint, pendaran cherry blossom glow, dan aksen ceria.' },
    { id: 'theme_cool', name: 'Cool Ocean Cyan', price: 40, icon: '🌊', color: '#06b6d4', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4) 0%, rgba(2, 132, 199, 0.2) 100%)', accentLabel: 'Cyber Ocean & Cyan Glow', desc: 'Atmosfer cyan samudera cybernetic dengan background deep ocean dark tint, pendaran neon cyan, dan gaya futuristik.' },
    { id: 'theme_green', name: 'Mint Emerald', price: 40, icon: '🌿', color: '#10b981', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(4, 120, 87, 0.2) 100%)', accentLabel: 'Fresh Sage & Emerald Glow', desc: 'Atmosfer hijau mint alami dengan background deep forest tint, pendaran neon sage, dan efek tenang di mata.' },
    { id: 'theme_gold', name: 'Royal Amber Gold', price: 50, icon: '👑', badge: 'EKSKLUSIF', color: '#f59e0b', textColor: '#ffffff', bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.45) 0%, rgba(180, 83, 9, 0.25) 100%)', accentLabel: 'Midnight Gold Shimmer', desc: 'Tema emas kerajaan eksklusif dengan background midnight amber, pendaran gold shimmer glow, dan aksen luxury champagne.' }
  ];

  const mainRewards = [
    { id: 'free_1m', name: 'Gratis 1 Bulan Premium', price: 130, icon: '⚡', desc: 'Perpanjang masa aktif akun premium CekNilai selama 1 bulan penuh secara gratis.' },
    { id: 'free_12m', name: 'Gratis 1 Tahun Premium', price: 1060, icon: '👑', badge: 'Terbaik', desc: 'Akses penuh fitur premium CekNilai selama setahun penuh. Hadiah terbaik untuk guru setia.' },
    { id: 'cash_1m', name: 'Uang Tunai Rp 1.000.000', price: 6500, icon: '💵', desc: 'Tukarkan 6.500 poin Anda dengan uang tunai Rp 1.000.000 yang ditransfer langsung ke rekening bank atau e-wallet Anda.' }
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
      
      {/* Trial Mode Sticky Banner */}
      {trialTheme && (
        <div 
          style={{ 
            padding: '12px 18px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)', 
            color: '#ffffff',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 24px var(--primary-glow)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>👁️</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                Mode Uji Coba Tema: {trialTheme.name}
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                Sisa waktu uji coba: <strong>{formatTimer(trialTheme.timeLeft)}</strong> (Revert otomatis setelah waktu habis)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => stopThemeTrial(false)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700' }}
            >
              ✕ Hentikan Uji Coba
            </button>
            <button
              onClick={() => handleRedeem(trialTheme.id, trialTheme.name, trialTheme.price)}
              className="btn"
              style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '800', backgroundColor: '#ffffff', color: '#000000', border: 'none' }}
            >
              ⚡ Tukar Permanen ({trialTheme.price} Poin)
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>🎁 Hadiah & Referral</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px', margin: 0 }}>
            Bagikan kode referral dan tukarkan poin dengan hadiah fisik atau tema kustom.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Points Display Card */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
            borderRadius: '14px', 
            padding: '24px', 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.85, fontWeight: '700' }}>Poin Saya</span>
            <button
              type="button"
              onClick={() => setInfoModal({
                title: "🎁 Poin Saya",
                text: "Klaim poin saat rekan Anda mendaftar atau berlangganan. Poin dapat ditukarkan dengan tema warna kustom (mulai 40 poin), gratis akses langganan premium bulanan/tahunan atau hadiah uang tunai."
              })}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
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
              title="Penjelasan Poin Saya"
            >
              ?
            </button>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {data.balance}
            <span style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.9 }}>POIN</span>
          </div>
        </div>

        {/* Copy Referral Code Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)', fontWeight: '700' }}>🔗 Kode Referral Saya</span>
            <button
              type="button"
              onClick={() => setInfoModal({
                title: "🔗 Kode Referral Saya",
                text: "Bagikan kode unik Anda kepada rekan guru lain agar mereka dapat menggunakannya saat konfirmasi pembayaran pertama mereka. Anda dan rekan Anda sama-sama mendapat poin bonus."
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
              title="Penjelasan Kode Referral"
            >
              ?
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div 
              style={{ 
                flex: 1, 
                backgroundColor: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                fontFamily: 'monospace', 
                fontSize: '1.2rem', 
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
              style={{ padding: '0 20px', fontSize: '0.9rem', fontWeight: '700' }}
            >
              {copied ? 'Tersalin!' : '📋 Salin'}
            </button>
          </div>
        </div>

      </div>

      {/* Active Theme Control Bar (If user has unlocked themes) */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🎨</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.88rem' }}>Tema Tampilan Aktif</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Pilih warna aksen aplikasi favorit Anda dari tema yang telah Anda tukar.
            </div>
          </div>
        </div>
        
        <div className="theme-chips-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Default theme button */}
          <button
            onClick={() => applyTheme('default')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '700',
              border: (activeTheme === 'default' && !trialTheme) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              backgroundColor: (activeTheme === 'default' && !trialTheme) ? 'var(--primary-glow)' : 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            🔵 Standar (Blue)
          </button>
          
          {themeRewards.map((theme) => {
            const unlocked = isThemeUnlocked(theme.id);
            if (!unlocked) return null;
            const isActive = (activeTheme === theme.id && !trialTheme);

            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: isActive ? `2px solid ${theme.color}` : '1px solid var(--border-color)',
                  backgroundColor: isActive ? `${theme.color}20` : 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{theme.icon}</span> {theme.name} {isActive && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gift Redeem Section — Full Width Primary Section */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>🎁 Tukar Poin Hadiah</h4>
          <button
            type="button"
            onClick={() => setInfoModal({
              title: "🎁 Tukar Poin Hadiah",
              text: "Tukarkan poin Anda mulai dari 40 poin untuk membuka tema warna aplikasi unik (Noir B&W, Pastel, Pinky, Cyan, Mint, Gold) atau kumpulkan untuk perpanjangan masa aktif & uang tunai. Anda juga dapat mencoba (preview) tema 5 menit sebelum menukar!"
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
            title="Penjelasan Penukaran"
          >
            ?
          </button>
        </div>

        {/* Sub-section 1: Tema Tampilan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎨 Tema Tampilan
          </div>

          <div className="theme-grid">
            {themeRewards.map((theme) => {
              const unlocked = isThemeUnlocked(theme.id);
              const isActive = (activeTheme === theme.id && !trialTheme);
              const isTrialActive = (trialTheme && trialTheme.id === theme.id);
              const isEligible = data.balance >= theme.price;

              return (
                <div
                  key={theme.id}
                  style={{
                    borderRadius: '12px',
                    border: isTrialActive ? `2px dashed ${theme.color}` : isActive ? `2px solid ${theme.color}` : unlocked ? `1px solid ${theme.color}40` : '1px solid var(--border-color)',
                    backgroundColor: (isActive || isTrialActive) ? `${theme.color}10` : 'var(--bg-secondary)',
                    boxShadow: (isActive || isTrialActive) ? `0 4px 16px ${theme.color}20` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* Mini UI Teaser Banner */}
                  <div style={{
                    height: '60px',
                    background: theme.bgGradient,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    borderBottom: `1px solid ${theme.color}25`
                  }}>
                    {/* Header Teaser */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.color, boxShadow: `0 0 6px ${theme.color}` }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: theme.textColor || 'var(--text-primary)', opacity: 0.95 }}>{theme.accentLabel}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', color: theme.textColor || theme.color, backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
                          {theme.price} POIN
                        </span>
                        {theme.badge && (
                          <span style={{ backgroundColor: theme.color, color: '#ffffff', fontSize: '0.55rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {theme.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini Action Mockup */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ backgroundColor: theme.color, color: '#ffffff', fontSize: '0.55rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                        Aksen Utama
                      </div>
                      <div style={{ width: '35px', height: '10px', borderRadius: '4px', backgroundColor: `${theme.color}40` }} />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.1rem' }}>{theme.icon}</span>
                          <span style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{theme.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInfoModal({ title: `${theme.icon} ${theme.name}`, text: theme.desc })}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ?
                        </button>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4, height: '2.8em', overflow: 'hidden' }}>
                        {theme.desc}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {unlocked ? (
                      <button
                        onClick={() => applyTheme(theme.id)}
                        className={`btn ${isActive ? 'btn-success' : 'btn-secondary'}`}
                        style={{
                          padding: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          width: '100%'
                        }}
                      >
                        {isActive ? '✓ Terpasang' : 'Gunakan Tema'}
                      </button>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          onClick={() => startThemeTrial(theme)}
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px'
                          }}
                        >
                          {isTrialActive ? '👁️ Testing...' : '👁️ Uji 5m'}
                        </button>
                        
                        <button
                          onClick={() => handleRedeem(theme.id, theme.name, theme.price)}
                          className={`btn ${isEligible ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '6px 4px',
                            fontSize: '0.68rem',
                            fontWeight: '800'
                          }}
                          disabled={!isEligible || redeemingId !== null}
                        >
                          {redeemingId === theme.id ? '...' : isEligible ? `⚡ Tukar` : `${data.balance}/${theme.price}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

        {/* Sub-section 2: Hadiah Utama */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            👑 Langganan & Cash
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {mainRewards.map((reward) => {
              const progressPercent = Math.min(100, Math.round((data.balance / reward.price) * 100));
              const isEligible = data.balance >= reward.price;

              return (
                <div 
                  key={reward.id} 
                  style={{ 
                    padding: '14px', 
                    borderRadius: '12px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{reward.icon}</span>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{reward.name}</span>
                      <button
                        type="button"
                        onClick={() => setInfoModal({
                          title: `${reward.icon} ${reward.name}`,
                          text: reward.desc
                        })}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          fontWeight: '800',
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Penjelasan Hadiah"
                      >
                        ?
                      </button>
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
      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 16px 0' }}>📋 Riwayat Poin</h4>
        
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
                <li><strong>Masa Berlaku Poin</strong>: Poin akumulatif dan tidak pernah hangus. Dapat ditukar tema warna (40 poin) atau langganan/cash.</li>
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

    </div>
  );
}
