'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ConsentValues {
  personalInfoConsent: boolean;
}

interface ConsentCheckboxesProps {
  value: ConsentValues;
  onChange: (value: ConsentValues) => void;
  consentBody?: string;
  consentVersion?: string;
}

// ---------------------------------------------------------------------------
// Consent texts (v1.0)
// ---------------------------------------------------------------------------
const DEFAULT_CONSENT_BODY =
  '当社は、お客様から取得した氏名、電話番号、生年月日、メールアドレス、住所、Googleマップ上の位置情報、電気使用状況、催事会場等の情報を、Looopでんきの申込対応、関連サービスのご案内、アフターフォロー、今後のサービス改善のために利用します。また、太陽光発電・蓄電池等のご案内、見積、連絡を目的として、当社提携先の太陽光・蓄電池販売会社に、氏名、電話番号、メールアドレス、住所、Googleマップ上の位置情報、電気使用状況を提供することがあります。';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
function ConsentModal({
  body,
  version,
  onClose,
}: {
  body: string;
  version?: string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-text-primary/40"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-bg-base shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="consent-modal-title" className="text-h1 text-text-primary">
            個人情報の取得・利用に関する同意
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-text-tertiary hover:text-text-primary"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">
          {version ? (
            <p className="mb-2 text-xs text-text-tertiary">同意文バージョン: {version}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{body}</p>
        </div>
        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded border border-border bg-white px-4 text-sm text-text-primary hover:bg-bg-subtle"
          >
            閉じる
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Single consent row
// ---------------------------------------------------------------------------
function ConsentRow({
  id,
  label,
  required,
  checked,
  onChange,
  body,
  version,
}: {
  id: string;
  label: string;
  required?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  body: string;
  version?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className={cn(
          'rounded-lg border px-4 py-3',
          checked ? 'border-brand-primary bg-brand-primarySoft' : 'border-border bg-white',
        )}
      >
        <label className="flex cursor-pointer items-start gap-3" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-primary"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-required={required}
          />
          <div className="flex-1">
            <span className="text-sm text-text-primary">
              {label}
              {required && <span className="ml-1 text-status-error">*</span>}
              {!required && <span className="ml-1 text-xs text-text-tertiary">(任意)</span>}
            </span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="mt-2 text-xs text-brand-primary hover:underline"
        >
          同意文言を確認する
        </button>
      </div>
      {showModal && (
        <ConsentModal body={body} version={version} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ConsentCheckboxes
// ---------------------------------------------------------------------------
export function ConsentCheckboxes({
  value,
  onChange,
  consentBody = DEFAULT_CONSENT_BODY,
  consentVersion,
}: ConsentCheckboxesProps) {
  return (
    <div className="space-y-3">
      <ConsentRow
        id="personal-info-consent"
        label="個人情報の取得・利用および太陽光関連の情報提供に同意する"
        required
        checked={value.personalInfoConsent}
        onChange={(v) => onChange({ personalInfoConsent: v })}
        body={consentBody}
        version={consentVersion}
      />
    </div>
  );
}
