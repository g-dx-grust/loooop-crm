'use client';

import { useEffect, useState, useTransition } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { REFUND_REASONS } from '@/lib/constants';
import { REFUND_REASON_LABELS } from '@/lib/status-labels';
import { createRefund, type RefundFormInput } from '../bills/actions';

interface CustomerOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
}

const EMPTY: RefundFormInput = {
  customerId: '',
  reasonCode: 'application_cancelled',
  cancelDate: '',
  terminationDate: '',
  supplyStartDate: '',
  refundMonth: new Date().toISOString().slice(0, 7),
  refundAmount: '',
  note: '',
};

export function RefundFormSheet({ open, onClose, customers }: Props) {
  const [form, setForm] = useState<RefundFormInput>(EMPTY);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError('');
    }
  }, [open]);

  function handleChange<K extends keyof RefundFormInput>(key: K, value: RefundFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await createRefund(form);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? '保存に失敗しました');
      }
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="返還を登録"
      width="sm:w-[520px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave} loading={isPending}>保存</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="refund-customer" required>顧客</Label>
          <select
            id="refund-customer"
            value={form.customerId}
            onChange={(e) => handleChange('customerId', e.target.value)}
            className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
          >
            <option value="">— 選択 —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="refund-reason" required>返還理由</Label>
          <select
            id="refund-reason"
            value={form.reasonCode}
            onChange={(e) => handleChange('reasonCode', e.target.value)}
            className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none"
          >
            {REFUND_REASONS.map((r) => (
              <option key={r} value={r}>{REFUND_REASON_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="refund-cancel">キャンセル日</Label>
            <Input id="refund-cancel" type="date" value={form.cancelDate ?? ''} onChange={(e) => handleChange('cancelDate', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="refund-term">解約日</Label>
            <Input id="refund-term" type="date" value={form.terminationDate ?? ''} onChange={(e) => handleChange('terminationDate', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="refund-supply">供給開始日</Label>
            <Input id="refund-supply" type="date" value={form.supplyStartDate ?? ''} onChange={(e) => handleChange('supplyStartDate', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="refund-month" required>返還月</Label>
            <Input id="refund-month" type="month" value={form.refundMonth} onChange={(e) => handleChange('refundMonth', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="refund-amount" required>返還金額 (円)</Label>
            <Input id="refund-amount" type="number" inputMode="numeric" min={0} value={form.refundAmount} onChange={(e) => handleChange('refundAmount', e.target.value)} className="mt-1 tabular-nums" />
          </div>
        </div>
        <div>
          <Label htmlFor="refund-note">備考</Label>
          <textarea id="refund-note" value={form.note ?? ''} onChange={(e) => handleChange('note', e.target.value)} rows={3} className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand-primary focus-visible:outline-none" />
        </div>
        {error && <p className="text-xs text-status-error" role="alert">{error}</p>}
      </div>
    </Sheet>
  );
}
