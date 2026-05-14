'use client';

import { useEffect, useState, useTransition } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES, LOOOP_STATUSES } from '@/lib/constants';
import {
  LOOOP_PAYMENT_METHOD_LABELS,
  LOOOP_PLAN_LABELS,
  LOOOP_STATUS_LABELS,
} from '@/lib/status-labels';
import { createApplication, type ApplicationFormInput } from './actions';

interface CustomerOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
}

const EMPTY: ApplicationFormInput = {
  customerId: '',
  applicationDate: new Date().toISOString().slice(0, 10),
  contractDate: '',
  supplyStartDate: '',
  planCode: 'smart_time_one_lighting',
  paymentMethod: 'bank_account',
  status: 'applied',
  cancelDate: '',
  terminationDate: '',
  cancelReason: '',
  memo: '',
};

export function ApplicationFormSheet({ open, onClose, customers }: Props) {
  const [form, setForm] = useState<ApplicationFormInput>(EMPTY);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError('');
    }
  }, [open]);

  function handleChange<K extends keyof ApplicationFormInput>(key: K, value: ApplicationFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await createApplication(form);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? '保存に失敗しました');
      }
    });
  }

  const showCancel = form.status === 'cancelled';
  const showTerminate = form.status === 'terminated' || form.status === 'refund_target';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="申込登録"
      width="sm:w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} loading={isPending}>
            保存
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="app-customer" required>
            顧客
          </Label>
          <select
            id="app-customer"
            value={form.customerId}
            onChange={(e) => handleChange('customerId', e.target.value)}
            className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
          >
            <option value="">— 選択 —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="app-plan">対象プラン</Label>
            <select
              id="app-plan"
              value={form.planCode}
              onChange={(e) => handleChange('planCode', e.target.value)}
              className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {LOOOP_PLAN_CODES.map((p) => (
                <option key={p} value={p}>
                  {LOOOP_PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="app-method">支払方法</Label>
            <select
              id="app-method"
              value={form.paymentMethod}
              onChange={(e) => handleChange('paymentMethod', e.target.value)}
              className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {LOOOP_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {LOOOP_PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="app-date">申込日</Label>
            <Input
              id="app-date"
              type="date"
              value={form.applicationDate ?? ''}
              onChange={(e) => handleChange('applicationDate', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="app-contract">契約締結日</Label>
            <Input
              id="app-contract"
              type="date"
              value={form.contractDate ?? ''}
              onChange={(e) => handleChange('contractDate', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="app-supply">供給開始日</Label>
            <Input
              id="app-supply"
              type="date"
              value={form.supplyStartDate ?? ''}
              onChange={(e) => handleChange('supplyStartDate', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="app-status">申込ステータス</Label>
          <select
            id="app-status"
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
          >
            {LOOOP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LOOOP_STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        {showCancel && (
          <div>
            <Label htmlFor="app-cancel-date">キャンセル日</Label>
            <Input
              id="app-cancel-date"
              type="date"
              value={form.cancelDate ?? ''}
              onChange={(e) => handleChange('cancelDate', e.target.value)}
              className="mt-1"
            />
          </div>
        )}
        {showTerminate && (
          <div>
            <Label htmlFor="app-term-date">解約日</Label>
            <Input
              id="app-term-date"
              type="date"
              value={form.terminationDate ?? ''}
              onChange={(e) => handleChange('terminationDate', e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        <div>
          <Label htmlFor="app-memo">備考</Label>
          <textarea
            id="app-memo"
            value={form.memo ?? ''}
            onChange={(e) => handleChange('memo', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
          />
        </div>

        {error && (
          <p className="text-xs text-status-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
