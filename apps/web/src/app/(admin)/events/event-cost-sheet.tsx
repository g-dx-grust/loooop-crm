'use client';

import { useEffect, useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  getEventCostItems,
  upsertEventCostItem,
  deleteEventCostItem,
  type CostItemWithAmounts,
} from './actions';
import type { EventWithCount } from './actions';

interface Props {
  open: boolean;
  onClose: () => void;
  event: EventWithCount | null;
}

const EMPTY_FORM = { description: '', totalCost: '', markupRate: '10', billingDate: '', note: '' };

function fmt(n: number) {
  return n.toLocaleString('ja-JP');
}

export function EventCostSheet({ open, onClose, event }: Props) {
  const [items, setItems] = useState<CostItemWithAmounts[]>([]);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  useEffect(() => {
    if (open && event) {
      void getEventCostItems(event.id).then(setItems);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormError('');
    }
  }, [open, event]);

  function openNew() {
    setEditingId('new');
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function openEdit(item: CostItemWithAmounts) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      totalCost: String(item.totalCost),
      markupRate: String(item.markupRate),
      billingDate: item.billingDate ?? '',
      note: item.note ?? '',
    });
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError('');
  }

  function validateForm(): string | null {
    if (!form.description.trim()) return '費用明細を入力してください。';
    const cost = Number(form.totalCost);
    if (!Number.isFinite(cost) || cost < 0) return '費用合計を正しく入力してください。';
    const rate = Number(form.markupRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return '手間賃率は0〜100の範囲で入力してください。';
    return null;
  }

  function handleSave() {
    if (!event) return;
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError('');
    startTransition(async () => {
      const result = await upsertEventCostItem({
        id: editingId === 'new' ? undefined : (editingId ?? undefined),
        eventId: event.id,
        description: form.description.trim(),
        totalCost: Number(form.totalCost),
        markupRate: Number(form.markupRate),
        billingDate: form.billingDate || undefined,
        note: form.note.trim() || undefined,
      });
      if (!result.success) {
        showToast(result.error ?? '保存に失敗しました。', 'error');
        return;
      }
      const updated = await getEventCostItems(event.id);
      setItems(updated);
      setEditingId(null);
      setForm(EMPTY_FORM);
    });
  }

  function handleDelete(item: CostItemWithAmounts) {
    if (!confirm(`「${item.description}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteEventCostItem(item.id);
      if (!result.success) { showToast(result.error ?? '削除に失敗しました。', 'error'); return; }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    });
  }

  const totalCost   = items.reduce((s, i) => s + i.totalCost, 0);
  const totalMarkup = items.reduce((s, i) => s + i.markupAmount, 0);
  const totalBilled = items.reduce((s, i) => s + i.totalBilled, 0);

  const previewMarkup = (() => {
    const c = Number(form.totalCost);
    const r = Number(form.markupRate);
    if (!Number.isFinite(c) || !Number.isFinite(r)) return null;
    const m = Math.floor(c * r / 100);
    return { markup: m, total: c + m };
  })();

  const title = event
    ? `費用管理 — ${event.venueName ?? event.eventName}`
    : '費用管理';

  return (
    <Sheet open={open} onClose={onClose} title={title} width="sm:w-[640px]">
      <div className="space-y-4">
        {/* Cost items table */}
        {items.length > 0 && (
          <div className="overflow-hidden rounded border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                  <th className="h-8 px-3 text-left font-medium">費用明細</th>
                  <th className="h-8 px-3 text-right font-medium tabular-nums">費用合計</th>
                  <th className="h-8 px-3 text-right font-medium">手間賃率</th>
                  <th className="h-8 px-3 text-right font-medium tabular-nums">手間賃</th>
                  <th className="h-8 px-3 text-right font-medium tabular-nums">請求計</th>
                  <th className="h-8 w-16 px-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  editingId === item.id ? (
                    <tr key={item.id} className="border-b border-border bg-brand-primarySoft">
                      <td colSpan={6} className="px-3 py-2">
                        <InlineForm
                          form={form}
                          setForm={setForm}
                          error={formError}
                          previewMarkup={previewMarkup}
                          onSave={handleSave}
                          onCancel={cancelEdit}
                          isPending={isPending}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                      <td className="max-w-[180px] truncate px-3 text-text-primary">{item.description}</td>
                      <td className="whitespace-nowrap px-3 text-right tabular-nums text-text-primary">¥{fmt(item.totalCost)}</td>
                      <td className="whitespace-nowrap px-3 text-right text-text-secondary">{item.markupRate}%</td>
                      <td className="whitespace-nowrap px-3 text-right tabular-nums text-text-secondary">¥{fmt(item.markupAmount)}</td>
                      <td className="whitespace-nowrap px-3 text-right tabular-nums font-medium text-text-primary">¥{fmt(item.totalBilled)}</td>
                      <td className="whitespace-nowrap px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="flex size-6 items-center justify-center rounded text-text-tertiary hover:bg-bg-muted hover:text-text-primary"
                            aria-label="編集"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={isPending}
                            className="flex size-6 items-center justify-center rounded text-text-tertiary hover:bg-[#FFEBEE] hover:text-status-error disabled:opacity-50"
                            aria-label="削除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                {/* Totals row */}
                {editingId !== 'new' && (
                  <tr className="border-t-2 border-border bg-bg-subtle">
                    <td className="h-9 px-3 text-xs font-medium text-text-secondary">合計</td>
                    <td className="h-9 px-3 text-right tabular-nums text-xs font-medium text-text-primary">¥{fmt(totalCost)}</td>
                    <td className="h-9 px-3" />
                    <td className="h-9 px-3 text-right tabular-nums text-xs font-medium text-text-secondary">¥{fmt(totalMarkup)}</td>
                    <td className="h-9 px-3 text-right tabular-nums text-xs font-semibold text-brand-primary">¥{fmt(totalBilled)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Inline new form */}
        {editingId === 'new' && (
          <div className="rounded border border-brand-primary/30 bg-brand-primarySoft p-3">
            <p className="mb-2 text-xs font-medium text-brand-primary">費用を追加</p>
            <InlineForm
              form={form}
              setForm={setForm}
              error={formError}
              previewMarkup={previewMarkup}
              onSave={handleSave}
              onCancel={cancelEdit}
              isPending={isPending}
            />
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && editingId !== 'new' && (
          <p className="text-center text-sm text-text-tertiary">費用明細がありません</p>
        )}

        {/* Add button */}
        {editingId === null && (
          <Button variant="secondary" size="sm" onClick={openNew} className="gap-1.5">
            <Plus size={14} aria-hidden />
            費用を追加
          </Button>
        )}
      </div>
    </Sheet>
  );
}

interface InlineFormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  error: string;
  previewMarkup: { markup: number; total: number } | null;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function InlineForm({ form, setForm, error, previewMarkup, onSave, onCancel, isPending }: InlineFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-text-secondary">費用明細 <span className="text-status-error">*</span></label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="ブース代 / 人件費 / 交通費"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-secondary">費用合計（円）<span className="text-status-error">*</span></label>
          <Input
            type="text"
            inputMode="numeric"
            value={form.totalCost}
            onChange={(e) => setForm((f) => ({ ...f, totalCost: e.target.value.replace(/[^0-9]/g, '') }))}
            placeholder="50000"
            className="h-8 tabular-nums text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-secondary">手間賃率（%）</label>
          <Input
            type="text"
            inputMode="numeric"
            value={form.markupRate}
            onChange={(e) => setForm((f) => ({ ...f, markupRate: e.target.value.replace(/[^0-9]/g, '') }))}
            placeholder="10"
            className="h-8 tabular-nums text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-secondary">請求日（任意）</label>
          <Input
            type="date"
            value={form.billingDate}
            onChange={(e) => setForm((f) => ({ ...f, billingDate: e.target.value }))}
            className="h-8 tabular-nums text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-secondary">メモ（任意）</label>
          <Input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder=""
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Preview */}
      {previewMarkup && Number(form.totalCost) > 0 && (
        <div className="flex gap-4 text-xs text-text-secondary tabular-nums">
          <span>手間賃: <strong className="text-text-primary">¥{previewMarkup.markup.toLocaleString('ja-JP')}</strong></span>
          <span>請求計: <strong className="text-brand-primary">¥{previewMarkup.total.toLocaleString('ja-JP')}</strong></span>
        </div>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={isPending} className="gap-1">
          <Check size={13} aria-hidden />
          保存
        </Button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary"
        >
          <X size={13} aria-hidden />
          キャンセル
        </button>
      </div>
    </div>
  );
}
