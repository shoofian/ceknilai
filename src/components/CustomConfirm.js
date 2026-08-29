'use client';
import { useState, useCallback, createContext, useContext } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: '', message: '', onConfirm: null, onCancel: null, type: 'confirm' });

  const showConfirm = useCallback(({ title, message, type = 'confirm' }) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        message,
        type,
        onConfirm: () => { setState(s => ({ ...s, open: false })); resolve(true); },
        onCancel: () => { setState(s => ({ ...s, open: false })); resolve(false); }
      });
    });
  }, []);

  const showAlert = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        message,
        type: 'alert',
        onConfirm: () => { setState(s => ({ ...s, open: false })); resolve(true); },
        onCancel: () => { setState(s => ({ ...s, open: false })); resolve(false); }
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      {state.open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) state.onCancel?.(); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'slideUpBottomSheet 0.2s ease-out'
            }}
          >
            {state.title && (
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>{state.title}</h4>
            )}
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {state.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {state.type === 'confirm' && (
                <button onClick={state.onCancel} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Batal
                </button>
              )}
              <button onClick={state.onConfirm} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                {state.type === 'alert' ? 'OK' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
