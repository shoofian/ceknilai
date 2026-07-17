"use client";

import { usePathname } from "next/navigation";

export default function WhatsAppWidget() {
  const pathname = usePathname();
  const isGuru = pathname?.startsWith("/guru");

  const handleRedirect = () => {
    window.open(
      "https://wa.me/6285157544004?text=Halo%20Admin,%20saya%20butuh%20bantuan%20mengenai%20Cek%20Nilai.",
      "_blank"
    );
  };

  return (
    <div className={`whatsapp-widget-container ${isGuru ? "in-guru" : ""} no-print`}>
      {/* Tooltip bubble (permanently visible on hover via CSS) */}
      <div className="wa-tooltip-bubble">
        <span className="wa-tooltip-dot" />
        <span>Ada Kendala? Chat WA</span>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={handleRedirect}
        className="wa-fab-btn"
        aria-label="Hubungi Admin di WhatsApp"
      >
        <span className="wa-pulse-ring wa-pulse-1" />
        <span className="wa-pulse-ring wa-pulse-2" />
        
        {/* SVG WhatsApp Icon */}
        <svg 
          viewBox="0 0 24 24" 
          className="wa-icon"
          fill="currentColor"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.86-9.86.001-2.636-1.02-5.11-2.871-6.963C16.6 2.11 14.126.965 11.493.965c-5.434 0-9.858 4.422-9.863 9.864-.002 1.71.465 3.385 1.353 4.887L1.93 21.053l4.717-1.899zm12.803-7.856c-.303-.151-1.793-.884-2.073-.986-.28-.102-.484-.153-.688.152-.204.305-.79.986-.968 1.19-.178.203-.357.229-.66.078-1.026-.513-1.802-.979-2.525-2.223-.192-.33-.192-.533-.03-.7.145-.15.305-.357.458-.533.153-.177.204-.305.306-.51.102-.203.051-.381-.026-.533-.076-.152-.688-1.657-.942-2.268-.247-.597-.5-.515-.688-.525-.178-.009-.382-.01-.586-.01-.204 0-.537.077-.817.382-.28.305-1.071 1.047-1.071 2.553 0 1.506 1.096 2.96 1.248 3.163.153.203 2.156 3.293 5.223 4.617.729.315 1.298.503 1.742.645.733.233 1.399.2 1.925.122.587-.087 1.793-.733 2.048-1.442.256-.708.256-1.317.18-1.44-.077-.123-.282-.199-.585-.35z" />
        </svg>
      </button>

      {/* Widget Styles */}
      <style jsx>{`
        .whatsapp-widget-container {
          position: fixed;
          bottom: 28px;
          left: 28px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-heading);
          animation: floatIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes floatIn {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Tooltip style */
        .wa-tooltip-bubble {
          position: absolute;
          left: 72px;
          white-space: nowrap;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(var(--glass-blur));
          color: var(--text-primary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transform: translateX(-15px);
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .whatsapp-widget-container:hover .wa-tooltip-bubble {
          opacity: 1;
          transform: translateX(0);
        }

        .wa-tooltip-dot {
          width: 8px;
          height: 8px;
          background-color: #25d366;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #25d366;
        }

        /* FAB Button styling */
        .wa-fab-btn {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.3), 
                      0 2px 6px rgba(0, 0, 0, 0.08), 
                      inset 0 1px 1px rgba(255, 255, 255, 0.2);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          z-index: 2;
          padding: 0;
          outline: none;
        }

        .wa-fab-btn:hover {
          transform: scale(1.1) rotate(8deg);
          box-shadow: 0 12px 32px rgba(37, 211, 102, 0.45), 
                      0 4px 12px rgba(37, 211, 102, 0.2);
        }

        .wa-fab-btn:active {
          transform: scale(0.92);
        }

        .wa-icon {
          width: 28px;
          height: 28px;
          color: #ffffff;
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15));
          transition: transform 0.4s ease;
        }

        .wa-fab-btn:hover .wa-icon {
          transform: scale(1.05);
        }

        /* Pulsing Ring Animations */
        .wa-pulse-ring {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 1px solid rgba(37, 211, 102, 0.45);
          pointer-events: none;
          z-index: 1;
        }

        .wa-pulse-1 {
          animation: waGlow 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        .wa-pulse-2 {
          animation: waGlow 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 1.25s;
        }

        @keyframes waGlow {
          0% {
            transform: scale(0.95);
            opacity: 1;
            border-color: rgba(37, 211, 102, 0.6);
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
            border-color: rgba(37, 211, 102, 0);
          }
        }

        /* Desktop specific shift for guru dashboard */
        @media (min-width: 768px) {
          .whatsapp-widget-container.in-guru {
            left: calc(var(--sidebar-width) + 28px);
          }
        }
        
        @media (max-width: 480px) {
          .whatsapp-widget-container {
            bottom: 20px;
            left: 20px;
          }
          .wa-tooltip-bubble {
            left: 68px;
            padding: 6px 12px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
