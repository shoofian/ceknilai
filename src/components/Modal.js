import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '600px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '1.2rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Close modal"
          >
            ✖️
          </button>
        </div>
        <div style={{ marginTop: '16px' }}>{children}</div>
      </div>
    </div>
  );
}
