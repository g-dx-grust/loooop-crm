'use client';

import { useEffect, useState, useTransition } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertBill, type BillFormInput } from './actions';
import type { BillListItem, CustomerOption } from './queries';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES } from '@/lib/constants';
import { LOOOP_PAYMENT_METHOD_LABELS, LOOOP_PLAN_LABELS } from '@/lib/status-labels';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: BillListItem | null;
  customers: CustomerOption[];
}

const EMPTY: BillFormInput = {
  customerId: '',
  billMonth: new Date().toISOString().slice(0, 7),
  usageKwh: '',
  electricFee: '',
  paymentMethod: 'bank_account',
  planCode: 'smart_time_one_lighting',
  applicationMonth: '',
  contractMonth: '',
  supplyStartDate: '',
  expectedPaymentMonth: '',
  paidAmount: '',
  refundFlagged: false,
  note: '',
};

export function BillFormSheet({ open, onClose, initial, customers }: Props) {
  const [form, setForm] = useState<BillFormInput>(EMPTY);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        id: initial.id,
        customerId: initial.customerId,
        billMonth: initial.billMonth,
        usageKwh: initial.usageKwh?.toString() ?? '',
        electricFee: initial.electricFee?.toString() ?? '',
        paymentMethod: initial.paymentMethod,
        planCode: initial.planCode,
        applicationMonth: initial.applicationMonth ?? '',
        contractMonth: initial.contractMonth ?? '',
        supplyStartDate: initial.supplyStartDate ?? '',
        expectedPaymentMonth: initial.expectedPaymentMonth ?? '',
        paidAmount: initial.paidAmount?.toString() ?? '',
        refundFlagged: initial.refundFlagged,
        note: initial.note ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [open, initial]);

  function handleChange<K extends keyof BillFormInput>(key: K, value: BillFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await upsertBill(form);
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
      title={initial ? '明細編集' : '明細登録'}
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
          <Label htmlFor="bill-customer" required>
            顧客
          </Label>
          <select
            id="bill-customer"
            value={form.customerId}
            onChange={(e) => handleChange('customerId', e.target.value)}
            disabled={Boolean(initial)}
            className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm text-text-primary disabled:bg-bg-muted disabled:text-text-disabled focus-visible:border-brand-primary focus-visible:outline-none"
          >
            <option value="">— 選択 —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.staffName ? ` / ${c.staffName}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bill-month" required>
              明細対象月
            </Label>
            <Input
              id="bill-month"
              type="month"
              value={form.billMonth}
              onChange={(e) => handleChange('billMonth', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-plan">対象プラン</Label>
            <select
              id="bill-plan"
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bill-usage">使用量 (kWh)</Label>
            <Input
              id="bill-usage"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.usageKwh ?? ''}
              onChange={(e) => handleChange('usageKwh', e.target.value)}
              placeholder="未入力で最低基準"
              className="mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="bill-fee">電気料金 (円)</Label>
            <Input
              id="bill-fee"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.electricFee ?? ''}
              onChange={(e) => handleChange('electricFee', e.target.value)}
              className="mt-1 tabular-nums"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="bill-payment-method" required>
            支払方法
          </Label>
          <select
            id="bill-payment-method"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bill-app-month">申込月</Label>
            <Input
              id="bill-app-month"
              type="month"
              value={form.applicationMonth ?? ''}
              onChange={(e) => handleChange('applicationMonth', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-contract-month">契約締結月</Label>
            <Input
              id="bill-contract-month"
              type="month"
              value={form.contractMonth ?? ''}
              onChange={(e) => handleChange('contractMonth', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bill-supply-date">供給開始日</Label>
            <Input
              id="bill-supply-date"
              type="date"
              value={form.supplyStartDate ?? ''}
              onChange={(e) => handleChange('supplyStartDate', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bill-expected-month">入金予定月</Label>
            <Input
              id="bill-expected-month"
              type="month"
              value={form.expectedPaymentMonth ?? ''}
              onChange={(e) => handleChange('expectedPaymentMonth', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="bill-paid">入金金額 (円)</Label>
          <Input
            id="bill-paid"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.paidAmount ?? ''}
            onChange={(e) => handleChange('paidAmount', e.target.value)}
            className="mt-1 tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="bill-refund"
            type="checkbox"
            checked={Boolean(form.refundFlagged)}
            onChange={(e) => handleChange('refundFlagged', e.target.checked)}
            className="size-4 rounded border-border"
          />
          <Label htmlFor="bill-refund" className="!mb-0 cursor-pointer">
            返還対象として印を付ける
          </Label>
        </div>

        <div>
          <Label htmlFor="bill-note">備考</Label>
          <textarea
            id="bill-note"
            value={form.note ?? ''}
            onChange={(e) => handleChange('note', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
          />
        </div>

        <p className="text-xs text-text-tertiary">
          手数料額・差引手数料はマスターから自動計算されます（業務管理費2,000円差引）。
          使用量未入力の場合は最低基準（口座: 3,000円 / 上記以外: 6,500円）が適用されます。
        </p>

        {error && (
          <p className="text-xs text-status-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
