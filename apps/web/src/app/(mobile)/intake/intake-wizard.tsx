'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressForm, type AddressFormValues } from '@/components/address/address-form';
import { ConsentCheckboxes, type ConsentValues } from '@/components/consent/consent-checkboxes';
import { useToast } from '@/components/ui/toast';
import { createCustomer, type ConsentTextForIntake, type IntakeFormValues } from './actions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DRAFT_KEY = 'looop_crm.intake_draft';
const TOTAL_STEPS = 4;

const EMPTY_ADDRESS: AddressFormValues = {
  postalCode: '',
  prefecture: '',
  city: '',
  street: '',
  building: '',
  residenceType: '',
  ownershipType: '',
  pinConfirmed: false,
  pinCorrected: false,
  accuracyStatus: 'unconfirmed',
};

const EMPTY_CONSENT: ConsentValues = {
  personalInfoConsent: false,
};

const EMPTY_FORM: IntakeFormValues = {
  name: '',
  kana: '',
  phone: '',
  birthDate: '',
  email: '',
  address: EMPTY_ADDRESS,
  monthlyElectricBill: '',
  wattage: '',
  billUsageMonth: '',
  eventId: '',
  consent: EMPTY_CONSENT,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EventOption {
  id: string;
  eventName: string;
  venueName: string | null;
  eventDate: string | null;
  status?: string;
}

interface IntakeWizardProps {
  events: EventOption[];
  consentText: ConsentTextForIntake;
}

// ---------------------------------------------------------------------------
// Step indicator (4 dots)
// ---------------------------------------------------------------------------
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`ステップ ${current} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all',
            i + 1 === current
              ? 'h-2.5 w-2.5 bg-brand-primary'
              : i + 1 < current
                ? 'h-2 w-2 bg-brand-primary/60'
                : 'h-2 w-2 bg-border-strong',
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field label helper
// ---------------------------------------------------------------------------
function FieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-text-secondary">
      {children}
      {required && <span className="ml-1 text-status-error">*</span>}
      {optional && <span className="ml-1 text-xs text-text-tertiary">(任意)</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — 基本情報
// ---------------------------------------------------------------------------
function Step1({
  form,
  onChange,
  errors,
}: {
  form: IntakeFormValues;
  onChange: (partial: Partial<IntakeFormValues>) => void;
  errors: Partial<Record<string, string>>;
}) {
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phoneWarning, setPhoneWarning] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  const handlePhoneChange = (raw: string) => {
    // Normalize full-width digits to half-width, remove non-digits
    const normalized = raw
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[^0-9]/g, '')
      .slice(0, 11);
    onChange({ phone: normalized });

    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    if (normalized.length >= 10) {
      phoneCheckTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers/check-phone?phone=${normalized}`);
          const data = (await res.json()) as { duplicated: boolean };
          if (data.duplicated) {
            setPhoneWarning('この電話番号はすでに登録されています。');
          } else {
            setPhoneWarning('');
          }
        } catch {
          setPhoneWarning('');
        }
      }, 400);
    } else {
      setPhoneWarning('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="name" required>
          お客様名
        </FieldLabel>
        <Input
          id="name"
          type="text"
          placeholder="山田 太郎"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-10 text-base"
          invalid={!!errors.name}
          aria-required
        />
        {errors.name && <p className="mt-1 text-xs text-status-error">{errors.name}</p>}
      </div>

      <div>
        <FieldLabel htmlFor="kana" optional>
          フリガナ
        </FieldLabel>
        <Input
          id="kana"
          type="text"
          placeholder="ヤマダ タロウ"
          value={form.kana}
          onChange={(e) => onChange({ kana: e.target.value })}
          className="h-10 text-base"
        />
      </div>

      <div>
        <FieldLabel htmlFor="phone" required>
          電話番号
        </FieldLabel>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="09012345678"
          value={form.phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="h-10 text-base tabular-nums"
          invalid={!!errors.phone}
          maxLength={11}
          aria-required
          aria-describedby={errors.phone ? 'phone-error' : phoneWarning ? 'phone-warning' : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="mt-1 text-xs text-status-error">
            {errors.phone}
          </p>
        )}
        {phoneWarning && (
          <p id="phone-warning" className="mt-1 text-xs text-status-warning">
            {phoneWarning}
          </p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="birth-date" required>
          生年月日
        </FieldLabel>
        <Input
          id="birth-date"
          type="date"
          value={form.birthDate}
          onChange={(e) => onChange({ birthDate: e.target.value })}
          className="h-10 text-base tabular-nums"
          invalid={!!errors.birthDate}
          max={today}
          aria-required
        />
        {errors.birthDate && (
          <p className="mt-1 text-xs text-status-error">{errors.birthDate}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="email" required>
          メールアドレス
        </FieldLabel>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder="taro@example.com"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="h-10 text-base"
          invalid={!!errors.email}
          aria-required
          required
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-status-error">
            {errors.email}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — でんき情報
// ---------------------------------------------------------------------------
function Step3({
  form,
  onChange,
  events,
  errors,
}: {
  form: IntakeFormValues;
  onChange: (partial: Partial<IntakeFormValues>) => void;
  events: EventOption[];
  errors: Partial<Record<string, string>>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="monthly-bill" required>
          月間の電気料金
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="monthly-bill"
            type="text"
            inputMode="numeric"
            placeholder="8000"
            value={form.monthlyElectricBill}
            onChange={(e) =>
              onChange({
                monthlyElectricBill: e.target.value
                  .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                  .replace(/[^0-9]/g, ''),
              })
            }
            className="h-10 w-40 text-base tabular-nums"
            invalid={!!errors.monthlyElectricBill}
            aria-required
          />
          <span className="text-sm text-text-secondary">円</span>
        </div>
        {errors.monthlyElectricBill && (
          <p className="mt-1 text-xs text-status-error">{errors.monthlyElectricBill}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="wattage" required>
          ワット数
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="wattage"
            type="text"
            inputMode="numeric"
            placeholder="4000"
            value={form.wattage}
            onChange={(e) =>
              onChange({
                wattage: e.target.value
                  .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
                  .replace(/[^0-9]/g, ''),
              })
            }
            className="h-10 w-40 text-base tabular-nums"
            invalid={!!errors.wattage}
            aria-required
          />
          <span className="text-sm text-text-secondary">W</span>
        </div>
        {errors.wattage && (
          <p className="mt-1 text-xs text-status-error">{errors.wattage}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="bill-usage-month" required>
          明細の利用月
        </FieldLabel>
        <Input
          id="bill-usage-month"
          type="month"
          value={form.billUsageMonth}
          onChange={(e) => onChange({ billUsageMonth: e.target.value })}
          className="h-10 text-base tabular-nums"
          invalid={!!errors.billUsageMonth}
          aria-required
        />
        {errors.billUsageMonth && (
          <p className="mt-1 text-xs text-status-error">{errors.billUsageMonth}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="event-id" required>
          催事会場
        </FieldLabel>
        <select
          id="event-id"
          value={form.eventId}
          onChange={(e) => onChange({ eventId: e.target.value })}
          aria-required
          aria-invalid={!!errors.eventId}
          className={cn(
            'h-10 w-full rounded border border-border bg-white px-3 text-base text-text-primary',
            'focus:border-brand-primary focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-bg-muted',
            errors.eventId && 'border-status-error',
          )}
        >
          <option value="">会場を選択してください</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.venueName ?? ev.eventName}
              {ev.eventDate ? ` (${ev.eventDate})` : ''}
            </option>
          ))}
        </select>
        {errors.eventId && (
          <p className="mt-1 text-xs text-status-error">{errors.eventId}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------
const STEP_LABELS = ['基本情報', '住所・地図', 'でんき情報', '同意'];

// ---------------------------------------------------------------------------
// IntakeWizard
// ---------------------------------------------------------------------------
export function IntakeWizard({ events, consentText }: IntakeWizardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setFormData] = useState<IntakeFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<IntakeFormValues>;
        setFormData({
          ...EMPTY_FORM,
          ...parsed,
          address: { ...EMPTY_ADDRESS, ...parsed.address },
          consent: { ...EMPTY_CONSENT, ...parsed.consent },
        });
        setHasDraft(true);
        showToast('下書きを復元しました。', 'info');
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave on change
  const updateForm = useCallback((partial: Partial<IntakeFormValues>) => {
    setFormData((prev) => {
      const next = { ...prev, ...partial };
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
          setHasDraft(true);
        } catch {
          // ignore
        }
      }, 1000);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setFormData(EMPTY_FORM);
    setHasDraft(false);
    showToast('下書きを削除しました。', 'info');
  }, [showToast]);

  // Validation per step
  const validateStep = (s: number): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (s === 1) {
      if (!form.name.trim()) newErrors.name = '氏名を入力してください。';
      if (!form.phone.trim()) {
        newErrors.phone = '電話番号を入力してください。';
      } else if (!/^0\d{9,10}$/.test(form.phone)) {
        newErrors.phone = '電話番号は10〜11桁の半角数字で入力してください。';
      }
      if (!form.email.trim()) {
        newErrors.email = 'メールアドレスを入力してください。';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        newErrors.email = 'メールアドレスの形式で入力してください。';
      }
      if (!form.birthDate.trim()) {
        newErrors.birthDate = '生年月日を入力してください。';
      } else {
        const selected = new Date(`${form.birthDate}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(selected.getTime()) || selected > today) {
          newErrors.birthDate = '生年月日は未来日を指定できません。';
        }
      }
    }

    if (s === 2) {
      const postalCode = form.address.postalCode
        .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/[^0-9]/g, '');
      if (!postalCode || postalCode.length !== 7) {
        newErrors.postalCode = '郵便番号は7桁で入力してください。';
      }
      if (!form.address.prefecture.trim()) newErrors.prefecture = '都道府県を入力してください。';
      if (!form.address.city.trim()) newErrors.city = '市区町村を入力してください。';
      if (!form.address.street.trim()) newErrors.street = '番地を入力してください。';
      if (!form.address.pinConfirmed) {
        newErrors.pinConfirmed = '地図のピン位置を確定してください。';
      }
    }

    if (s === 3) {
      if (!form.eventId) newErrors.eventId = '催事会場を選択してください。';

      if (!form.monthlyElectricBill.trim()) {
        newErrors.monthlyElectricBill = '月間の電気料金を入力してください。';
      } else {
        const val = Number(form.monthlyElectricBill);
        if (!Number.isFinite(val) || val <= 0 || val > 300000) {
          newErrors.monthlyElectricBill = '1〜300,000円の範囲で入力してください。';
        }
      }

      if (!form.wattage.trim()) {
        newErrors.wattage = 'ワット数を入力してください。';
      } else {
        const val = Number(form.wattage);
        if (!Number.isFinite(val) || val <= 0 || val > 200000) {
          newErrors.wattage = '1〜200,000Wの範囲で入力してください。';
        }
      }

      if (!form.billUsageMonth.trim()) {
        newErrors.billUsageMonth = '明細の利用月を入力してください。';
      } else {
        const [year, month] = form.billUsageMonth.split('-').map(Number);
        const now = new Date();
        if (
          !year ||
          !month ||
          month < 1 ||
          month > 12 ||
          year > now.getFullYear() ||
          (year === now.getFullYear() && month > now.getMonth() + 1)
        ) {
          newErrors.billUsageMonth = '未来月は指定できません。';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(step)) return;
    if (!form.consent.personalInfoConsent) return;

    setSubmitting(true);
    try {
      const result = await createCustomer(form);
      if (result.success && result.customerId) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        showToast('お客様を登録しました。', 'success');
        router.push(`/customers/${result.customerId}`);
      } else {
        showToast(result.error ?? '登録に失敗しました。', 'error');
      }
    } catch {
      showToast('登録中にエラーが発生しました。', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div>
          <h1 className="text-display text-text-primary">催事フォーム</h1>
          <p className="mt-0.5 text-xs text-text-tertiary">{STEP_LABELS[step - 1]}</p>
        </div>
        {hasDraft && (
          <button
            type="button"
            onClick={clearDraft}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-tertiary hover:bg-bg-subtle"
          >
            <Trash2 size={12} aria-hidden />
            下書きを削除
          </button>
        )}
      </div>

      {/* Step dots */}
      <div className="mb-4">
        <StepDots current={step} total={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div className="flex-1 pb-24">
        {step === 1 && (
          <Step1 form={form} onChange={updateForm} errors={errors} />
        )}
        {step === 2 && (
          <AddressForm
            value={form.address}
            onChange={(addr) => updateForm({ address: addr })}
            errors={errors}
          />
        )}
        {step === 3 && (
          <Step3 form={form} onChange={updateForm} events={events} errors={errors} />
        )}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              以下の同意事項をご確認の上、チェックを入れてください。
            </p>
            <ConsentCheckboxes
              value={form.consent}
              onChange={(consent) => updateForm({ consent })}
              consentBody={consentText.body}
              consentVersion={consentText.version}
            />
            {!form.consent.personalInfoConsent && (
              <p className="text-xs text-status-error">
                個人情報の取得・利用への同意は必須です。
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg-base px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleBack}
              className="flex-1"
              disabled={submitting}
            >
              前へ
            </Button>
          )}

          {step < TOTAL_STEPS && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleNext}
              className={cn('flex-1', step === 1 && 'ml-0')}
            >
              次へ
            </Button>
          )}

          {step === TOTAL_STEPS && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!form.consent.personalInfoConsent || submitting}
              className="flex-1"
            >
              登録する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
