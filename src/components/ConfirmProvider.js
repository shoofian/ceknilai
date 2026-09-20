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
    isPrompt: false,
    promptValue: "",
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
      isPrompt: false,
      promptValue: "",
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
      isPrompt: false,
      promptValue: "",
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const triggerPrompt = useCallback((message, onSubmit, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Input",
      message: message,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText || "Batal",
      isDanger: !!options.isDanger,
      isAlert: false,
      isPrompt: true,
      promptValue: options.defaultValue || "",
      onConfirm: (val) => {
        if (onSubmit) onSubmit(val);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const confirmAsync = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      triggerConfirm(message, () => resolve(true), { ...options, onCancel: () => resolve(false) });
    });
  }, [triggerConfirm]);

  const alertAsync = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      triggerAlert(message, () => resolve(), options);
    });
  }, [triggerAlert]);

  const promptAsync = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      triggerPrompt(message, (val) => resolve(val), { ...options, onCancel: () => resolve(null) });
    });
  }, [triggerPrompt]);

  return (
    <ConfirmContext.Provider value={{ triggerConfirm, triggerAlert, triggerPrompt, confirmAsync, alertAsync, promptAsync }}>
      {children}
      {confirmConfig.isOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999999 }}>
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
            
            {confirmConfig.isPrompt && (
              <input 
                type="text" 
                value={confirmConfig.promptValue} 
                onChange={(e) => setConfirmConfig(prev => ({ ...prev, promptValue: e.target.value }))}
                className="form-input" 
                autoFocus
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", outline: "none" }}
              />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              {!confirmConfig.isAlert && confirmConfig.cancelText && (
                <button 
                  onClick={confirmConfig.onCancel}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontWeight: "600", color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "8px", cursor: "pointer" }}
                >
                  {confirmConfig.cancelText}
                </button>
              )}
              <button 
                onClick={() => confirmConfig.isPrompt ? confirmConfig.onConfirm(confirmConfig.promptValue) : confirmConfig.onConfirm()}
                className={confirmConfig.isDanger ? "btn btn-danger" : "btn btn-primary"}
                style={{ 
                  padding: "8px 16px", 
                  fontWeight: "600",
                  backgroundColor: confirmConfig.isDanger ? "var(--danger)" : "var(--primary)",
                  color: "white",
                  border: confirmConfig.isDanger ? "1px solid var(--danger)" : "1px solid var(--primary)",
                  borderRadius: "8px",
                  cursor: "pointer"
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
