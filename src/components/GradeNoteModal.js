"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const PRESET_CHIPS = [
  { label: "Remedial", icon: "📌", text: "Remedial" },
  { label: "Susulan", icon: "⏱️", text: "Susulan" },
  { label: "Terlambat", icon: "⚠️", text: "Terlambat mengumpulkan tugas" },
  { label: "Belum Lengkap", icon: "📝", text: "Tugas belum lengkap, perlu revisi" },
  { label: "Sakit / Izin", icon: "🏥", text: "Tugas pengganti (Sakit/Izin)" },
  { label: "Bonus", icon: "⭐", text: "Bonus keaktifan" }
];

const subscribeNoop = () => () => {};

export default function GradeNoteModal({
  isOpen,
  onClose,
  student,
  col,
  initialNote = "",
  onSave
}) {
  const [note, setNote] = useState(initialNote || "");
  const [saving, setSaving] = useState(false);
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const textareaRef = useRef(null);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, saving]);

  if (!isOpen || !isMounted) return null;

  const handleChipClick = (chipText) => {
    if (!note.trim()) {
      setNote(chipText);
    } else if (!note.includes(chipText)) {
      setNote(`${note.trim()}, ${chipText}`);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onSave("");
    } finally {
      setSaving(false);
    }
  };

  const modalNode = (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="glass-card animate-scale-up"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--bg-primary, #ffffff)",
          borderRadius: "var(--radius-lg, 14px)",
          padding: "20px 22px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border-color, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxSizing: "border-box"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.15rem" }}>💬</span>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                Catatan Nilai Siswa
              </h3>
            </div>
            <div style={{ marginTop: "4px", fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: "1.3" }}>
              <strong style={{ color: "var(--primary)" }}>{student?.nama}</strong>
              {col?.nama && <span> &bull; Kolom: <strong>{col.nama}</strong></span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px 8px",
              borderRadius: "6px",
              lineHeight: 1
            }}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Quick Chips (Preset Cepat) */}
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Pilihan Keterangan Cepat (1x Ketuk)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PRESET_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip.text)}
                style={{
                  fontSize: "0.78rem",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  userSelect: "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label htmlFor="grade-note-textarea" style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)" }}>
            Keterangan Khusus:
          </label>
          <textarea
            id="grade-note-textarea"
            ref={textareaRef}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan keterangan nilai untuk siswa ini (misal: Remedial pada 12 Nov, tugas susulan)..."
            className="form-input"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              fontSize: "0.9rem",
              borderRadius: "8px",
              border: "1.5px solid var(--border-color)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              resize: "vertical",
              lineHeight: 1.4
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            <span>*Catatan ini akan langsung terlihat oleh siswa di halaman cek nilai.</span>
            <span>{note.length} karakter</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", gap: "8px" }}>
          {initialNote ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              style={{
                fontSize: "0.82rem",
                color: "var(--danger, #ef4444)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px 8px",
                fontWeight: "600"
              }}
            >
              Hapus Catatan
            </button>
          ) : <div />}

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-secondary"
              style={{
                padding: "8px 14px",
                fontSize: "0.85rem",
                cursor: "pointer",
                borderRadius: "6px"
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                padding: "8px 18px",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                borderRadius: "6px",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {saving ? "Menyimpan..." : "Simpan Catatan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : null;
}
