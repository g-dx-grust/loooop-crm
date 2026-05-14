'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet } from '@/components/ui/sheet';
import { LOOOP_PAYMENT_METHODS, LOOOP_PLAN_CODES } from '@/lib/constants';
import { LOOOP_PAYMENT_METHOD_LABELS, LOOOP_PLAN_LABELS } from '@/lib/status-labels';
import type { FeeMasterRow } from './queries';
import { upsertFeeMaster, deleteFeeMaster, type FeeMasterFormInput } from './actions';

const EMPTY: FeeMasterFormInput = {
  planCode: 'smart_time_one_lighting',
  paymentMethod: 'bank_account',
  kwhMin: '0',
  kwhMax: '',
  feeAmount: '',
  adminFee: '2000',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  note: '',
};

interface Props {
  rows: FeeMasterRow[];
}

export function FeeMasterClient({ rows }: Props) {
  const [editing, setEditing] = useState<FeeMasterRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FeeMasterFormInput>(EMPTY);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function openEdit(row: FeeMasterRow) {
    setEditing(row);
    setForm({
      id: row.id,
      planCode: row.planCode,
      paymentMethod: row.paymentMethod,
      kwhMin: String(row.kwhMin),
      kwhMax: row.kwhMax == null ? '' : String(row.kwhMax),
      feeAmount: String(row.feeAmount),
      adminFee: String(row.adminFee),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? '',
      note: row.note ?? '',
    });
    setError('');
  }
  function openCreate() {
    setCreating(true);
    setForm(EMPTY);
    setError('');
  }
  function close() {
    setEditing(null);
    setCreating(false);
    setError('');
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertFeeMaster(form);
      if (result.success) close();
      else setError(result.error ?? '保存に失敗しました');
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirm('この区分を削除します。よろしいですか？')) return;
    startTransition(async () => {
      const result = await deleteFeeMaster(editing.id);
      if (result.success) close();
      else setError(result.error ?? '削除に失敗しました');
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2 border-b border-border bg-white px-4 py-2">
        <Button size="md" onClick={openCreate}>
          区分を追加
        </Button>
      </div>

      {/* Mobile card list (< lg) */}
      <ul className="space-y-2 p-3 lg:hidden">
        {rows.length === 0 ? (
          <li className="rounded border border-border bg-white py-8 text-center text-sm text-text-tertiary">
            マスター未登録
          </li>
        ) : rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="block w-full rounded-lg border border-border bg-white p-3 text-left transition-colors active:bg-bg-subtle"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {LOOOP_PLAN_LABELS[r.planCode] ?? r.planCode}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {LOOOP_PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}
                  </p>
                </div>
                <span className="tabular-nums text-sm font-semibold text-text-primary">
                  {r.feeAmount.toLocaleString('ja-JP')}円
                </span>
              </div>
              <dl className="mt-2.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-text-tertiary">kWh区分</dt>
                <dd className="tabular-nums text-text-secondary">
                  {r.kwhMin.toLocaleString('ja-JP')} 〜 {r.kwhMax == null ? '∞' : r.kwhMax.toLocaleString('ja-JP')}
                </dd>
                <dt className="text-text-tertiary">業務管理費</dt>
                <dd className="tabular-nums text-text-secondary">▲{r.adminFee.toLocaleString('ja-JP')}</dd>
                <dt className="text-text-tertiary">適用期間</dt>
                <dd className="tabular-nums text-text-secondary">{r.effectiveFrom} 〜 {r.effectiveTo ?? '無期限'}</dd>
              </dl>
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop table (≥ lg) */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">プラン</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">支払方法</th>
              <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">kWh下限</th>
              <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">kWh上限</th>
              <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">手数料額</th>
              <th className="h-9 whitespace-nowrap px-3 text-right font-medium tabular-nums">業務管理費</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">適用期間</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="h-10 px-4 text-center text-text-tertiary">マスター未登録</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                <td className="whitespace-nowrap px-3">{LOOOP_PLAN_LABELS[r.planCode] ?? r.planCode}</td>
                <td className="whitespace-nowrap px-3">{LOOOP_PAYMENT_METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</td>
                <td className="px-3 text-right tabular-nums">{r.kwhMin.toLocaleString('ja-JP')}</td>
                <td className="px-3 text-right tabular-nums">{r.kwhMax == null ? '∞' : r.kwhMax.toLocaleString('ja-JP')}</td>
                <td className="px-3 text-right tabular-nums">{r.feeAmount.toLocaleString('ja-JP')}円</td>
                <td className="px-3 text-right tabular-nums text-text-secondary">▲{r.adminFee.toLocaleString('ja-JP')}</td>
                <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">{r.effectiveFrom} 〜 {r.effectiveTo ?? '無期限'}</td>
                <td className="px-3"><Button variant="ghost" size="sm" onClick={() => openEdit(r)}>編集</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet
        open={creating || editing !== null}
        onClose={close}
        title={editing ? '料率区分を編集' : '料率区分を追加'}
        width="sm:w-[520px]"
        footer={
          <div className="flex justify-between">
            <div>
              {editing && (
                <Button variant="danger" onClick={handleDelete} loading={isPending}>削除</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={close}>キャンセル</Button>
              <Button onClick={handleSave} loading={isPending}>保存</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fm-plan">プラン</Label>
              <select id="fm-plan" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none">
                {LOOOP_PLAN_CODES.map((p) => <option key={p} value={p}>{LOOOP_PLAN_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="fm-method">支払方法</Label>
              <select id="fm-method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 flex h-8 w-full rounded border border-border bg-white px-3 text-sm focus-visible:border-brand-primary focus-visible:outline-none">
                {LOOOP_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{LOOOP_PAYMENT_METHOD_LABELS[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fm-min" required>kWh下限（含む）</Label>
              <Input id="fm-min" type="number" inputMode="numeric" min={0} value={form.kwhMin} onChange={(e) => setForm({ ...form, kwhMin: e.target.value })} className="mt-1 tabular-nums" />
            </div>
            <div>
              <Label htmlFor="fm-max">kWh上限（含む。空欄=∞）</Label>
              <Input id="fm-max" type="number" inputMode="numeric" min={0} value={form.kwhMax} onChange={(e) => setForm({ ...form, kwhMax: e.target.value })} className="mt-1 tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fm-fee" required>手数料額 (円)</Label>
              <Input id="fm-fee" type="number" inputMode="numeric" min={0} value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} className="mt-1 tabular-nums" />
            </div>
            <div>
              <Label htmlFor="fm-admin" required>業務管理費 (円・税別)</Label>
              <Input id="fm-admin" type="number" inputMode="numeric" min={0} value={form.adminFee} onChange={(e) => setForm({ ...form, adminFee: e.target.value })} className="mt-1 tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fm-from" required>適用開始日</Label>
              <Input id="fm-from" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="fm-to">適用終了日</Label>
              <Input id="fm-to" type="date" value={form.effectiveTo ?? ''} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="fm-note">備考</Label>
            <Input id="fm-note" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" />
          </div>
          {error && <p className="text-xs text-status-error" role="alert">{error}</p>}
        </div>
      </Sheet>
    </>
  );
}
