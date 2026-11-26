"use client";

import { useRef, useState } from "react";

export default function PinDigitInput({
  value = "",
  onChange,
  autoFocus = false,
  disabled = false
}) {
  const [showDigits, setShowDigits] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const updateAt = (index, char) => {
    const arr = Array.from({ length: 6 }, (_, i) => value[i] || "");
    arr[index] = char;
    onChange(arr.join(""));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      updateAt(index, "");
      return;
    }

    if (raw.length > 1) {
      // Handle multi-digit paste/autofill
      const combined = (value.slice(0, index) + raw).replace(/\D/g, "").slice(0, 6);
      onChange(combined);
      const nextFocus = Math.min(5, combined.length);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    updateAt(index, raw);
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        updateAt(index - 1, "");
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const nextFocus = Math.min(5, pasted.length - 1);
    inputRefs.current[nextFocus]?.focus();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", flex: 1, maxWidth: "320px" }}>
        {digits.map((d, idx) => {
          const isFocused = focusedIndex === idx;
          const isFilled = d !== "";
          return (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type={showDigits ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              disabled={disabled}
              autoFocus={autoFocus && idx === 0}
              value={d}
              onChange={(e) => handleChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              onFocus={(e) => {
                setFocusedIndex(idx);
                e.target.select();
              }}
              onBlur={() => setFocusedIndex(-1)}
              aria-label={`Digit PIN ke-${idx + 1}`}
              style={{
                width: "100%",
                height: "48px",
                textAlign: "center",
                fontSize: "1.25rem",
                fontWeight: "800",
                borderRadius: "12px",
                border: isFocused
                  ? "2px solid var(--primary, #3b82f6)"
                  : isFilled
                  ? "1.5px solid var(--primary, #3b82f6)"
                  : "1.5px solid var(--border-color)",
                backgroundColor: isFocused ? "var(--bg-primary)" : "var(--bg-secondary)",
                color: "var(--text-primary)",
                outline: "none",
                boxShadow: isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.18)" : "none",
                transition: "all 0.15s ease"
              }}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowDigits((prev) => !prev)}
        title={showDigits ? "Sembunyikan PIN" : "Tampilkan PIN"}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          width: "40px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1.05rem",
          flexShrink: 0,
          color: "var(--text-secondary)"
        }}
      >
        {showDigits ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
