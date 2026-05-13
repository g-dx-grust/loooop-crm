'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(29,33,41,0.40)]"
        onClick={onClose}
        aria-hidden
      />
      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm rounded-lg bg-white shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-h1 text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-text-tertiary hover:bg-bg-subtle"
            aria-label="閉じる"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
