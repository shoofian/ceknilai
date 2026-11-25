"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

function renderFormattedText(text) {
  if (!text) return null;
  const lines = String(text).split("\n");
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const rendered = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={pIdx}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.08)",
              padding: "1px 5px",
              borderRadius: "4px",
              fontSize: "0.85em"
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={pIdx}>{part}</React.Fragment>;
    });

    return (
      <div key={idx} style={{ minHeight: line.trim() === "" ? "8px" : "auto", lineHeight: 1.55 }}>
        {rendered}
      </div>
    );
  });
}

export default function GuruAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Halo! Saya **Asisten AI CekNilai**. Tanyakan cara pakai fitur apa saja, minta cek nilai siswa, cari siswa di bawah KKM, atau buat draf catatan siswa."
    }
  ]);

  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef(null);

  const activeKelasId = (() => {
    if (!pathname) return null;
    const match = pathname.match(/^\/guru\/kelas\/([^/]+)/);
    return match ? match[1] : null;
  })();

  useEffect(() => {
    const onOpenAssistant = (e) => {
      setIsOpen(true);
      const initialPrompt = e?.detail?.prompt;
      if (initialPrompt && typeof initialPrompt === "string") {
        setInput(initialPrompt);
      }
    };
    window.addEventListener("ceknilai:open-ai-assistant", onOpenAssistant);
    return () => window.removeEventListener("ceknilai:open-ai-assistant", onOpenAssistant);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  if (!pathname || !pathname.startsWith("/guru")) {
    return null;
  }

  const quickPrompts = activeKelasId
    ? [
        "Siapa siswa di bawah KKM di kelas ini?",
        "Cara atur bintang agar tidak menambah nilai akhir?",
        "Cara ekspor nilai & bintang ke Excel?",
        "Cara katrol nilai atau normalisasi?"
      ]
    : [
        "Tampilkan daftar kelas saya",
        "Cara ekspor nilai ke e-Rapor?",
        "Cara atur bintang agar tidak menambah nilai akhir?",
        "Cara membuat kelas baru & impor siswa?"
      ];

  const sendMessage = async (textToSend) => {
    const clean = (textToSend !== undefined ? textToSend : input).trim();
    if (!clean || loading) return;

    const nextMessages = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    if (textToSend === undefined) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/guru/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            pathname,
            kelasId: activeKelasId
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungi Asisten AI.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          navigationActions: data.navigationActions || [],
          pendingActions: data.pendingActions || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "Terjadi kesalahan saat memproses permintaan."}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgIdx, actionIdx, action) => {
    const key = `${msgIdx}-${actionIdx}`;
    setConfirmingIdx(key);
    try {
      const res = await fetch("/api/guru/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmAction: action })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menjalankan aksi.");
      }

      setMessages((prev) =>
        prev.map((m, i) => {
          if (i !== msgIdx) return m;
          const updatedPending = (m.pendingActions || []).map((p, pi) =>
            pi === actionIdx ? { ...p, status: "done" } : p
          );
          return { ...m, pendingActions: updatedPending };
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ ${data.message}`,
          navigationActions: data.navigateTo
            ? [{ label: "Buka Halaman Terkait", path: data.navigateTo }]
            : []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${err.message || "Gagal menjalankan aksi."}` }
      ]);
    } finally {
      setConfirmingIdx(null);
    }
  };

  const handleDismissAction = (msgIdx, actionIdx) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIdx) return m;
        const updatedPending = (m.pendingActions || []).map((p, pi) =>
          pi === actionIdx ? { ...p, status: "cancelled" } : p
        );
        return { ...m, pendingActions: updatedPending };
      })
    );
  };

  return (
    <div className="no-print">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Tanya Asisten AI CekNilai"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1150,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 18px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "linear-gradient(135deg, var(--primary, #3b82f6) 0%, #6366f1 100%)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "0.86rem",
            boxShadow: "0 10px 25px rgba(59, 130, 246, 0.35)",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🤖</span>
          <span>Asisten AI</span>
        </button>
      )}

      {/* Assistant Drawer / Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "min(430px, calc(100vw - 24px))",
            height: "min(620px, calc(100vh - 40px))",
            zIndex: 1250,
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px",
            overflow: "hidden",
            backgroundColor: "var(--bg-primary, #ffffff)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.3)"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg, var(--primary, #3b82f6) 0%, #6366f1 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.35rem" }}>🤖</span>
              <div>
                <div style={{ fontWeight: "800", fontSize: "0.95rem", lineHeight: 1.2 }}>
                  Asisten AI Guru
                </div>
                <div style={{ fontSize: "0.72rem", opacity: 0.9 }}>
                  Panduan Fitur & Asisten Tugas CekNilai
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() =>
                  setMessages([
                    {
                      role: "assistant",
                      content: "Percakapan direset. Ada yang bisa saya bantu hari ini?"
                    }
                  ])
                }
                title="Reset Percakapan"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup Asisten"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  width: "28px",
                  height: "28px",
                  fontSize: "0.95rem",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: "var(--bg-secondary, #f8fafc)"
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: "6px"
                  }}
                >
                  <div
                    style={{
                      maxWidth: "88%",
                      padding: "10px 13px",
                      borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      backgroundColor: isUser ? "var(--primary, #3b82f6)" : "var(--bg-primary, #ffffff)",
                      color: isUser ? "#ffffff" : "var(--text-primary)",
                      border: isUser ? "none" : "1px solid var(--border-color)",
                      fontSize: "0.82rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}
                  >
                    {renderFormattedText(m.content)}
                  </div>

                  {/* Navigation Quick Buttons */}
                  {!isUser && Array.isArray(m.navigationActions) && m.navigationActions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxWidth: "88%" }}>
                      {m.navigationActions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => {
                            setIsOpen(false);
                            router.push(act.path);
                          }}
                          className="btn btn-secondary"
                          style={{
                            padding: "5px 10px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            borderRadius: "8px",
                            color: "var(--primary)",
                            borderColor: "var(--primary)"
                          }}
                        >
                          ↗ {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pending Human-in-the-Loop Confirmation Cards */}
                  {!isUser && Array.isArray(m.pendingActions) && m.pendingActions.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "88%" }}>
                      {m.pendingActions.map((pAct, pIdx) => {
                        const key = `${idx}-${pIdx}`;
                        return (
                          <div
                            key={pIdx}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(245, 158, 11, 0.08)",
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              fontSize: "0.78rem"
                            }}
                          >
                            <div style={{ fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
                              ⚡ Konfirmasi Aksi:
                            </div>
                            <div style={{ color: "var(--text-secondary)", marginBottom: "8px", lineHeight: 1.4 }}>
                              {pAct.summary}
                            </div>
                            {pAct.status === "done" ? (
                              <span style={{ color: "var(--success, #10b981)", fontWeight: "700" }}>
                                ✅ Sudah dijalankan
                              </span>
                            ) : pAct.status === "cancelled" ? (
                              <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>
                                Dibatalkan
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleConfirmAction(idx, pIdx, pAct)}
                                  disabled={confirmingIdx === key}
                                  className="btn btn-primary"
                                  style={{ padding: "5px 12px", fontSize: "0.75rem", fontWeight: "700" }}
                                >
                                  {confirmingIdx === key ? "Memproses..." : "✅ Setujui & Jalankan"}
                                </button>
                                <button
                                  onClick={() => handleDismissAction(idx, pIdx)}
                                  disabled={confirmingIdx === key}
                                  className="btn btn-secondary"
                                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                                >
                                  Batal
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: "var(--bg-primary, #ffffff)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)"
                }}
              >
                ⏳ Asisten sedang berpikir & memeriksa data...
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div
            style={{
              padding: "8px 12px 4px 12px",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              borderTop: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-primary)"
            }}
          >
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  whiteSpace: "nowrap",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{
              padding: "10px 12px",
              display: "flex",
              gap: "8px",
              backgroundColor: "var(--bg-primary)",
              alignItems: "center"
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Tanya cara pakai fitur atau minta bantu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{ flex: 1, fontSize: "0.82rem", padding: "8px 12px" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              style={{ padding: "8px 14px", fontSize: "0.82rem", fontWeight: "700" }}
            >
              Kirim
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
