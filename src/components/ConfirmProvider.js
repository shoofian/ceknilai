"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }) {
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Batal",
    isDanger: false,
    isAlert: false,
    onConfirm: null,
    onCancel: null
  });

  const triggerConfirm = useCallback((message, onConfirm, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Konfirmasi",
      message: message,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText || "Batal",
      isDanger: !!options.isDanger,
      isAlert: false,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const triggerAlert = useCallback((message, onConfirm = null, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Informasi",
      message: message,
      confirmText: options.confirmText || "Tutup",
      cancelText: "",
      isDanger: !!options.isDanger,
      isAlert: true,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ triggerConfirm, triggerAlert }}>
      {children}
      {confirmConfig.isOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", border: confirmConfig.isDanger ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-focus)", boxShadow: "var(--shadow-lg), 0 0 30px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: confirmConfig.isDanger ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)", color: confirmConfig.isDanger ? "var(--danger)" : "var(--primary)", fontSize: "1.2rem", flexShrink: 0 }}>
                {(() => {
                  const titleLower = (confirmConfig.title || "").toLowerCase();
                  if (confirmConfig.isDanger || titleLower.includes("⚠️") || titleLower.includes("hapus") || titleLower.includes("delete")) return "⚠️";
                  if (titleLower.includes("sukses") || titleLower.includes("berhasil")) return "✅";
                  return "ℹ️";
                })()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: confirmConfig.isDanger ? "var(--danger)" : "var(--text-primary)" }}>
                  {confirmConfig.title.replace("⚠️", "").trim() || "Konfirmasi"}
                </h4>
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              {confirmConfig.message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              {!confirmConfig.isAlert && confirmConfig.cancelText && (
                <button 
                  onClick={confirmConfig.onCancel}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontWeight: "600", color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}
                >
                  {confirmConfig.cancelText}
                </button>
              )}
              <button 
                onClick={confirmConfig.onConfirm}
                className={confirmConfig.isDanger ? "btn btn-danger" : "btn btn-primary"}
                style={{ 
                  padding: "8px 16px", 
                  fontWeight: "600",
                  backgroundColor: confirmConfig.isDanger ? "var(--danger)" : "var(--primary)",
                  color: "white",
                  border: confirmConfig.isDanger ? "1px solid var(--danger)" : "1px solid var(--primary)"
                }}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
