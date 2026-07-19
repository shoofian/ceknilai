"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function QrScannerModal({ isOpen, onClose, kelas, onMarkPresence }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [activePertemuanId, setActivePertemuanId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [lastScannedStudent, setLastScannedStudent] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const html5QrCodeRef = useRef(null);
  const activePertemuanIdRef = useRef('');
  const lastScannedNisnRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const toastTimerRef = useRef(null);

  // Keep meeting ID in sync with ref to avoid camera restarts on dropdown changes
  useEffect(() => {
    activePertemuanIdRef.current = activePertemuanId;
  }, [activePertemuanId]);

  // Auto-select the latest meeting
  useEffect(() => {
    if (kelas?.skemaPenilaian?.pertemuan?.length > 0) {
      const meetings = kelas.skemaPenilaian.pertemuan;
      // Default to the last created meeting (newest)
      setActivePertemuanId(meetings[meetings.length - 1].id);
    }
  }, [kelas]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Web Audio API beep sound generator
  const playBeep = (success) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (success) {
        // High-pitched sweet beep for success
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        oscillator.stop(audioCtx.currentTime + 0.16);
      } else {
        // Double lower buzzer beep for errors
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(180, audioCtx.currentTime); // F3 note
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        
        // Rapid drop and beep twice
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        oscillator.stop(audioCtx.currentTime + 0.13);
        
        // Second beep shortly after
        setTimeout(() => {
          try {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
            osc2.start();
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
            osc2.stop(audioCtx.currentTime + 0.13);
          } catch (e) {}
        }, 180);
      }
    } catch (err) {
      console.error("Web Audio API not supported or blocked by user gesture:", err);
    }
  };

  // Main QR scan callback
  const handleScanResult = (decodedText) => {
    if (!activePertemuanIdRef.current) return;

    const scannedNisn = decodedText.trim();
    const now = Date.now();

    // Ignore duplicate scans of the same student within 3 seconds
    if (scannedNisn === lastScannedNisnRef.current && (now - lastScannedTimeRef.current) < 3000) {
      return;
    }

    const student = kelas?.siswa?.find(s => s.nisn === scannedNisn || s.id === scannedNisn);

    if (student) {
      const isAlreadyPresent = student.nilai[`_presensi_${activePertemuanIdRef.current}`] === 'H';
      
      playBeep(true);
      setLastScannedStudent({
        nama: student.nama,
        nisn: student.nisn,
        alreadyPresent: isAlreadyPresent,
        success: true
      });
      setScanStatus('success');

      // Update refs for same-card deduplication
      lastScannedNisnRef.current = scannedNisn;
      lastScannedTimeRef.current = now;

      // Add to session history
      setScanHistory(prev => {
        const exists = prev.some(h => h.nisn === student.nisn);
        if (exists) return prev;
        return [{
          nama: student.nama,
          nisn: student.nisn,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          status: 'Hadir'
        }, ...prev];
      });

      // Invoke attendance update callback
      onMarkPresence(student.nisn, activePertemuanIdRef.current, 'H');
    } else {
      playBeep(false);
      setLastScannedStudent({
        nama: 'Tidak Terdaftar',
        nisn: scannedNisn,
        notFound: true,
        success: false
      });
      setScanStatus('error');

      // Also deduplicate error scans so it doesn't buzz repeatedly
      lastScannedNisnRef.current = scannedNisn;
      lastScannedTimeRef.current = now;
    }

    // Auto-clear the floating toast text after 2.5 seconds
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setLastScannedStudent(null);
      setScanStatus('idle');
    }, 2500);
  };

  // Fetch cameras list when modal opens
  useEffect(() => {
    let isMounted = true;
    
    const fetchCameras = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && isMounted) {
          setCameras(devices);
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') || 
            device.label.toLowerCase().includes('environment')
          );
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultCamId);
        } else if (isMounted) {
          setSelectedCameraId('environment');
        }
      } catch (e) {
        console.warn("Could not load camera list:", e);
        if (isMounted) {
          setSelectedCameraId('environment');
        }
      }
    };

    if (isOpen) {
      fetchCameras();
      setScanHistory([]);
      lastScannedNisnRef.current = '';
      lastScannedTimeRef.current = 0;
      setLastScannedStudent(null);
      setScanStatus('idle');
    }
  }, [isOpen]);

  // Unified useEffect to handle scanner lifecycle
  useEffect(() => {
    let isMounted = true;
    let html5QrCode = null;

    const runScanner = async () => {
      if (!isOpen || !selectedCameraId) return;

      // Give a 300ms delay to let the DOM element 'reader' render and ensure
      // any previous instances have finished stopping and cleaning up.
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isMounted) return;

      const element = document.getElementById("reader");
      if (!element) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        // Clear target DOM container to ensure no leftovers from previous runs
        element.innerHTML = '';

        html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        setIsScanning(true);
        setErrorMsg('');

        const cameraConfig = selectedCameraId === 'environment' 
          ? { facingMode: "environment" } 
          : selectedCameraId;

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 24, // Higher scan rate for faster detection
            qrbox: (width, height) => {
              // Increase box to 85% of view area to capture codes easily
              const size = Math.min(width, height) * 0.85;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            handleScanResult(decodedText);
          },
          (errorMessage) => {
            // Ignore verbose error messages
          }
        );
      } catch (err) {
        console.error("Scanner startup error:", err);
        if (isMounted) {
          setErrorMsg("Kamera tidak dapat diakses atau sedang digunakan.");
          setIsScanning(false);
        }
      }
    };

    runScanner();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        const stopScanner = async () => {
          if (html5QrCode.isScanning) {
            try {
              await html5QrCode.stop();
            } catch (e) {
              console.error("Error stopping scanner during cleanup:", e);
            }
          }
        };
        stopScanner();
      }
    };
  }, [isOpen, selectedCameraId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📷 Presensi QR Code Siswa
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Scan barcode/QR Code kartu siswa untuk kehadiran otomatis
            </p>
          </div>
          <button
            onClick={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Configuration Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Pertemuan selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pilih Pertemuan
            </label>
            <select
              value={activePertemuanId}
              onChange={(e) => setActivePertemuanId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {kelas?.skemaPenilaian?.pertemuan?.map(p => (
                <option key={p.id} value={p.id}>{p.nama} ({p.tanggal})</option>
              ))}
            </select>
          </div>

          {/* Camera selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pilih Kamera
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={cameras.length === 0}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                textOverflow: 'ellipsis'
              }}
            >
              {cameras.length === 0 ? (
                <option value="environment">Kamera Belakang (Bawaan)</option>
              ) : (
                cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id.slice(0, 5)}`}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Camera Viewfinder Box */}
        <div 
          style={{ 
            position: 'relative', 
            width: '100%', 
            aspectRatio: '4/3', 
            borderRadius: '12px', 
            overflow: 'hidden',
            backgroundColor: '#090d16',
            border: `2px solid ${
              scanStatus === 'success' ? 'var(--success)' : 
              scanStatus === 'error' ? 'var(--danger)' : 
              cooldownTime > 0 ? 'var(--primary)' : 'var(--border-color)'
            }`,
            boxShadow: scanStatus === 'success' ? '0 0 20px rgba(16, 185, 129, 0.25)' : 
                       scanStatus === 'error' ? '0 0 20px rgba(239, 68, 68, 0.25)' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {/* Scanner element */}
          <div id="reader" style={{ width: '100%', height: '100%' }}></div>

          {/* Loader or error messages */}
          {!isScanning && !errorMsg && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Mengaktifkan kamera...</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', gap: '8px', color: 'var(--danger)' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          {/* Visual Overlay: Scanner targeting bracket overlay when active */}
          {isScanning && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80%', height: '80%', border: '2px solid rgba(255, 255, 255, 0.25)', borderRadius: '12px', position: 'relative' }}>
                {/* Scanner Laser effect */}
                <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', backgroundColor: 'rgba(59, 130, 246, 0.8)', boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)', animation: 'scanline 2s ease-in-out infinite' }} />
                
                {/* Framing brackets */}
                <div style={{ position: 'absolute', top: -2, left: -2, width: '16px', height: '16px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderTopLeftRadius: '8px' }} />
                <div style={{ position: 'absolute', top: -2, right: -2, width: '16px', height: '16px', borderTop: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderTopRightRadius: '8px' }} />
                <div style={{ position: 'absolute', bottom: -2, left: -2, width: '16px', height: '16px', borderBottom: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderBottomLeftRadius: '8px' }} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: '16px', height: '16px', borderBottom: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderBottomRightRadius: '8px' }} />
              </div>
            </div>
          )}

          {/* Floating Toast Status Banner inside the viewfinder */}
          {lastScannedStudent && (
            <div 
              style={{ 
                position: 'absolute', 
                bottom: '16px', 
                left: '16px', 
                right: '16px', 
                backgroundColor: lastScannedStudent.notFound 
                  ? 'rgba(239, 68, 68, 0.95)' 
                  : (lastScannedStudent.alreadyPresent ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)'), 
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '10px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(4px)',
                animation: 'fadeInUp 0.2s ease-out',
                zIndex: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              {lastScannedStudent.notFound ? (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>❌ SISWA TIDAK TERDAFTAR</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>ID: {lastScannedStudent.nisn}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>
                    {lastScannedStudent.alreadyPresent ? '⚠️ SUDAH TERCATAT' : '🟢 KEHADIRAN TERCATAT'}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>{lastScannedStudent.nama}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>NISN: {lastScannedStudent.nisn}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Scan History Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: '120px', maxHeight: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Riwayat Sesi Ini ({scanHistory.length} siswa)
            </span>
            {scanHistory.length > 0 && (
              <button 
                onClick={() => setScanHistory([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
              >
                Clear
              </button>
            )}
          </div>
          
          <div 
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              padding: '6px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            {scanHistory.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Belum ada siswa yang dipindai dalam sesi ini.
              </div>
            ) : (
              scanHistory.map((item, idx) => (
                <div 
                  key={item.nisn + idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)',
                    border: idx === 0 ? '1px dashed rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                    fontSize: '0.8rem',
                    animation: idx === 0 ? 'fadeIn 0.3s' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.nama}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>NISN: {item.nisn}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {item.status}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              onClose();
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 24px', fontSize: '0.85rem' }}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Embedded Animations and Keyframes */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scanline {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
