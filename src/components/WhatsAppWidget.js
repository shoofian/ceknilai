"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasBadge, setHasBadge] = useState(true);
  const pathname = usePathname();
  const tooltipTimerRef = useRef(null);

  useEffect(() => {
    // Show tooltip after 3.5 seconds to attract attention gently
    tooltipTimerRef.current = setTimeout(() => {
      const dismissed = sessionStorage.getItem("wa_tooltip_dismissed");
      if (!dismissed) {
        setShowTooltip(true);
      }
    }, 3500);

    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setShowTooltip(false);
    setHasBadge(false);
    sessionStorage.setItem("wa_tooltip_dismissed", "true");
  };

  const handleCloseTooltip = (e) => {
    e.stopPropagation();
    setShowTooltip(false);
    sessionStorage.setItem("wa_tooltip_dismissed", "true");
  };

  const handleQuickReply = (text) => {
    const formattedText = encodeURIComponent(text);
    window.open(`https://wa.me/6285157544004?text=${formattedText}`, "_blank");
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    const formattedText = encodeURIComponent(customMessage.trim());
    window.open(`https://wa.me/6285157544004?text=${formattedText}`, "_blank");
    setCustomMessage("");
    setIsOpen(false);
  };

  const isGuru = pathname?.startsWith("/guru");

  return (
    <div className={`whatsapp-widget-container ${isGuru ? "in-guru" : ""} no-print`}>
      {/* Tooltip bubble */}
      {showTooltip && !isOpen && (
        <div className="wa-tooltip animate-fade-in">
          <div className="wa-tooltip-content">
            <span style={{ fontSize: "1.1rem" }}>💬</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <p style={{ margin: 0, fontWeight: "700", fontSize: "0.8rem", color: "var(--text-primary)" }}>Butuh Bantuan?</p>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Chat Admin jika bingung/kendala</p>
            </div>
          </div>
          <button className="wa-tooltip-close" onClick={handleCloseTooltip}>✕</button>
          <div className="wa-tooltip-arrow" />
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={handleToggle}
        className="wa-fab-btn"
        title="Hubungi Bantuan WhatsApp"
      >
        {/* Pulsing ring animation */}
        <span className="wa-pulse-ring" />
        
        {/* WhatsApp Icon */}
        <svg 
          viewBox="0 0 24 24" 
          width="28" 
          height="28" 
          fill="currentColor"
          style={{ color: "#ffffff", zIndex: 2 }}
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.86-9.86.001-2.636-1.02-5.11-2.871-6.963C16.6 2.11 14.126.965 11.493.965c-5.434 0-9.858 4.422-9.863 9.864-.002 1.71.465 3.385 1.353 4.887L1.93 21.053l4.717-1.899zm12.803-7.856c-.303-.151-1.793-.884-2.073-.986-.28-.102-.484-.153-.688.152-.204.305-.79.986-.968 1.19-.178.203-.357.229-.66.078-1.026-.513-1.802-.979-2.525-2.223-.192-.33-.192-.533-.03-.7.145-.15.305-.357.458-.533.153-.177.204-.305.306-.51.102-.203.051-.381-.026-.533-.076-.152-.688-1.657-.942-2.268-.247-.597-.5-.515-.688-.525-.178-.009-.382-.01-.586-.01-.204 0-.537.077-.817.382-.28.305-1.071 1.047-1.071 2.553 0 1.506 1.096 2.96 1.248 3.163.153.203 2.156 3.293 5.223 4.617.729.315 1.298.503 1.742.645.733.233 1.399.2 1.925.122.587-.087 1.793-.733 2.048-1.442.256-.708.256-1.317.18-1.44-.077-.123-.282-.199-.585-.35z" />
        </svg>

        {/* Small orange badge */}
        {hasBadge && (
          <span className="wa-badge" />
        )}
      </button>

      {/* Main Chat Widget */}
      {isOpen && (
        <div className="wa-chat-widget animate-fade-in">
          {/* Header */}
          <div className="wa-header">
            <div className="wa-header-info">
              {/* Avatar with pulsing green dot */}
              <div className="wa-avatar-container">
                <div className="wa-avatar">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a6 6 0 0 0-3.44-5.28M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18.72a6 6 0 0 1 3.44-5.28M12 14c3.31 0 6 2.69 6 6v.72H6V20c0-3.31 2.69-6 6-6Z" />
                  </svg>
                </div>
                <span className="wa-online-dot" />
              </div>
              <div>
                <h4 style={{ margin: 0, color: "#ffffff", fontSize: "0.92rem", fontWeight: "700" }}>
                  Support Cek Nilai
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.68rem", color: "#e8f5e9", opacity: 0.9 }}>
                    Online &bull; Biasanya membalas cepat
                  </span>
                </div>
              </div>
            </div>
            
            {/* Close button */}
            <button className="wa-close-btn" onClick={handleToggle}>✕</button>
          </div>

          {/* Chat Body */}
          <div className="wa-body">
            {/* Admin Message */}
            <div className="wa-msg-bubble">
              <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: "1.4" }}>
                Halo! 👋 Jika Anda mengalami <strong>kebingungan</strong> atau <strong>kendala</strong> dalam menggunakan aplikasi Cek Nilai, silakan chat kami.
              </p>
              <span className="wa-msg-time">
                {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Quick topics section */}
            <div style={{ marginTop: "12px" }}>
              <p style={{ margin: "0 0 6px 4px", fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pilih Topik Bantuan
              </p>
              <div className="wa-quick-replies">
                <button onClick={() => handleQuickReply("Halo Admin, saya bingung cara mengecek nilai rapor siswa di Cek Nilai.")}>
                  🔍 Cara Cek Nilai Rapor
                </button>
                <button onClick={() => handleQuickReply("Halo Admin, saya mengalami kendala saat mencoba masuk ke akun panel guru.")}>
                  🔑 Kendala Akses Masuk
                </button>
                <button onClick={() => handleQuickReply("Halo Admin, saya butuh bantuan terkait format impor Excel nilai kelas.")}>
                  📊 Format Impor Nilai Excel
                </button>
                <button onClick={() => handleQuickReply("Halo Admin, saya ingin menanyakan tentang integrasi data dari Dapodik.")}>
                  🔌 Hubungkan Dapodik
                </button>
              </div>
            </div>
          </div>

          {/* Chat Input Footer */}
          <form className="wa-footer" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Tulis pesan bantuan Anda..."
              className="wa-input"
            />
            <button 
              type="submit" 
              className="wa-send-btn"
              disabled={!customMessage.trim()}
              title="Kirim ke WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Widget Styles */}
      <style jsx>{`
        .whatsapp-widget-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 999;
          font-family: var(--font-body);
        }

        /* Tooltip style */
        .wa-tooltip {
          position: absolute;
          bottom: 70px;
          left: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg), 0 10px 30px rgba(0, 0, 0, 0.1);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          backdrop-filter: blur(10px);
          max-width: 280px;
        }

        .wa-tooltip-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wa-tooltip-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.75rem;
          padding: 2px;
          margin-left: 8px;
          align-self: flex-start;
        }

        .wa-tooltip-close:hover {
          color: var(--text-primary);
        }

        .wa-tooltip-arrow {
          position: absolute;
          bottom: -6px;
          left: 24px;
          width: 10px;
          height: 10px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          transform: rotate(45deg);
        }

        /* FAB Button styling */
        .wa-fab-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25D366, #128C7E);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35), 0 0 0 1px rgba(37, 211, 102, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1001;
        }

        .wa-fab-btn:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45), 0 0 0 4px rgba(37, 211, 102, 0.2);
        }

        .wa-fab-btn:active {
          transform: scale(0.95);
        }

        /* Pulsing Ring Animation */
        .wa-pulse-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: rgba(37, 211, 102, 0.4);
          animation: waPulse 2s infinite;
          z-index: 0;
        }

        @keyframes waPulse {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        /* Badge styling */
        .wa-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background-color: #ff9800;
          border: 2px solid #ffffff;
          border-radius: 50%;
          z-index: 3;
          animation: pulseBadge 1.5s infinite;
        }

        @keyframes pulseBadge {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        /* Chat Widget box styling */
        .wa-chat-widget {
          position: absolute;
          bottom: 74px;
          left: 0;
          width: 320px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg), 0 10px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1002;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(16px);
        }

        /* Header styling */
        .wa-header {
          background: linear-gradient(135deg, #128C7E, #075E54);
          color: #ffffff;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .wa-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wa-avatar-container {
          position: relative;
        }

        .wa-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .wa-online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background-color: #4caf50;
          border: 2px solid #128C7E;
          border-radius: 50%;
          animation: dotPulse 1.8s infinite;
        }

        @keyframes dotPulse {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }

        .wa-close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.75);
          font-size: 1.1rem;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }

        .wa-close-btn:hover {
          color: #ffffff;
        }

        /* Body styling */
        .wa-body {
          padding: 16px;
          background-color: var(--bg-primary);
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Message Bubble */
        .wa-msg-bubble {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 4px 14px 14px 14px;
          padding: 10px 12px;
          max-width: 90%;
          position: relative;
          box-shadow: var(--shadow-sm);
        }

        .wa-msg-time {
          font-size: 0.62rem;
          color: var(--text-muted);
          display: block;
          text-align: right;
          margin-top: 4px;
        }

        /* Quick replies chips */
        .wa-quick-replies {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .wa-quick-replies button {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 0.75rem;
          text-align: left;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .wa-quick-replies button:hover {
          background-color: var(--primary-glow);
          color: var(--primary);
          border-color: var(--primary);
          transform: translateX(2px);
        }

        /* Footer styling */
        .wa-footer {
          padding: 12px 14px;
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wa-input {
          flex: 1;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 0.8rem;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }

        .wa-input:focus {
          border-color: #128C7E;
        }

        .wa-send-btn {
          background-color: #128C7E;
          color: #ffffff;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
        }

        .wa-send-btn:hover:not(:disabled) {
          background-color: #075E54;
          transform: scale(1.05);
        }

        .wa-send-btn:disabled {
          background-color: var(--border-color);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* Desktop specific shift for guru dashboard */
        @media (min-width: 768px) {
          .whatsapp-widget-container.in-guru {
            left: calc(var(--sidebar-width) + 24px);
          }
        }
        
        @media (max-width: 480px) {
          .whatsapp-widget-container {
            bottom: 16px;
            left: 16px;
          }
          .wa-chat-widget {
            width: 290px;
            bottom: 68px;
          }
          .wa-tooltip {
            bottom: 64px;
            max-width: 250px;
          }
        }
      `}</style>
    </div>
  );
}
