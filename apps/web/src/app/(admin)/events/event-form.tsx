'use client';

import { useEffect, useState, useTransition } from 'react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertEvent, type EventFormInput } from './actions';
import type { EventRow } from '@looop/db';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: EventRow | null;
}

const EMPTY: EventFormInput = {
  eventName: '',
  venueName: '',
  venueAddress: '',
  condition: '',
  area: '',
  eventDate: '',
  sourceType: 'event',
  status: 'active',
  cost: '',
  memo: '',
};

const STATUS_OPTIONS = [
  { value: 'active',    label: '有効' },
  { value: 'scheduled', label: '予定' },
  { value: 'cancelled', label: 'キャンセル' },
];

const SOURCE_OPTIONS = [
  { value: 'event',  label: '催事' },
  { value: 'telema', label: 'テレマ（季節指数除外）' },
];

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="ml-1 text-status-error">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function EventFormSheet({ open, onClose, initial }: Props) {
  const [form, setForm] = useState<EventFormInput>(EMPTY);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        id:           initial.id,
        eventName:    initial.eventName,
        venueName:    initial.venueName    ?? '',
        venueAddress: initial.venueAddress ?? '',
        condition:    initial.condition    ?? '',
        area:         initial.area         ?? '',
        eventDate:    initial.eventDate    ?? '',
        sourceType:   initial.sourceType,
        status:       initial.status,
        cost:         initial.cost?.toString() ?? '',
        memo:         initial.memo         ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [open, initial]);

  function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await upsertEvent(form);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? '保存に失敗しました。');
      }
    });
  }

  const isTelematch = form.sourceType === 'telema';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? '催事・テレマ編集' : '催事・テレマ登録'}
      width="sm:w-[520px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave} loading={isPending}>保存</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 種別 */}
        <FieldRow label="種別" required>
          <div className="flex gap-3">
            {SOURCE_OPTIONS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="sourceType"
                  value={o.value}
                  checked={form.sourceType === o.value}
                  onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value }))}
                  className="accent-brand-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
          {isTelematch && (
            <p className="text-xs text-text-tertiary">テレマ案件は単価固定のため、季節指数の計算対象外です。</p>
          )}
        </FieldRow>

        {/* 催事名 */}
        <FieldRow label="催事名（管理用）" required>
          <Input
            value={form.eventName}
            onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
            placeholder={isTelematch ? 'テレマ 2026-06' : 'イオンモール幕張 2026-06（平日）'}
          />
        </FieldRow>

        {/* 会場名 */}
        {!isTelematch && (
          <FieldRow label="会場名" required>
            <Input
              value={form.venueName}
              onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))}
              placeholder="イオンモール幕張新都心"
            />
          </FieldRow>
        )}

        {/* 条件（平日/土日/GW） */}
        {!isTelematch && (
          <FieldRow label="催事条件">
            <Input
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              placeholder="平日 / 土日 / GW"
            />
          </FieldRow>
        )}

        {/* 会場住所 */}
        {!isTelematch && (
          <FieldRow label="会場住所">
            <Input
              value={form.venueAddress}
              onChange={(e) => setForm((f) => ({ ...f, venueAddress: e.target.value }))}
              placeholder="千葉県千葉市花見川区幕張1"
            />
          </FieldRow>
        )}

        {/* エリア */}
        <FieldRow label="エリア">
          <Input
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            placeholder="関東"
          />
        </FieldRow>

        {/* 参考日 */}
        <FieldRow label={isTelematch ? '開始日（任意）' : '催事日（任意）'}>
          <Input
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            className="tabular-nums"
          />
        </FieldRow>

        {/* ステータス */}
        <FieldRow label="ステータス" required>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="h-8 w-full rounded border border-border bg-white px-2 text-sm focus:border-brand-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldRow>

        {/* コスト */}
        <FieldRow label="費用（円）">
          <Input
            type="text"
            inputMode="numeric"
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value.replace(/[^0-9]/g, '') }))}
            placeholder="0"
            className="tabular-nums"
          />
        </FieldRow>

        {/* メモ */}
        <FieldRow label="メモ">
          <textarea
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            rows={2}
            className="w-full resize-none rounded border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </FieldRow>

        {error && <p className="text-xs text-status-error">{error}</p>}
      </div>
    </Sheet>
  );
}
