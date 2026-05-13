'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timerRef.current[id]);
    delete timerRef.current[id];
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      timerRef.current[id] = setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Position: top-center per CLAUDE.md §2.1 */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ width: 'min(calc(100vw - 32px), 360px)' }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------
const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-l-4 border-l-status-success',
  error: 'border-l-4 border-l-status-error',
  info: 'border-l-4 border-l-brand-primary',
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-bg-base px-4 py-3 shadow-overlay',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <span className="text-sm text-text-primary">{toast.message}</span>
      <button
        onClick={onClose}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-tertiary hover:text-text-primary"
        aria-label="閉じる"
      >
        <X size={14} />
      </button>
    </div>
  );
}
