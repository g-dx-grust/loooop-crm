'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/format';
import { createEvent, updateEvent, type CreateEventInput } from './actions';
import type { EventRow, StaffOption } from './queries';

interface Props {
  initialEvents: EventRow[];
  staffOptions: StaffOption[];
}

const EVENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: '予定' },
  { value: 'active', label: '受付中' },
  { value: 'closed', label: '終了' },
  { value: 'disabled', label: '停止' },
] as const;

const EVENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_STATUS_OPTIONS.map((status) => [status.value, status.label]),
);

const emptyForm: CreateEventInput = {
  eventName: '',
  venueName: '',
  venueAddress: '',
  eventDate: '',
  area: '',
  staffId: '',
  status: 'active',
  cost: undefined,
  memo: '',
};

export function EventsSection({ initialEvents, staffOptions }: Props) {
  const [events, _setEvents] = useState<EventRow[]>(initialEvents);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateEventInput>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setSheetOpen(true);
  }

  function openEdit(ev: EventRow) {
    setEditingId(ev.id);
    setForm({
      eventName: ev.eventName,
      venueName: ev.venueName ?? '',
      venueAddress: ev.venueAddress ?? '',
      eventDate: ev.eventDate ?? '',
      area: ev.area ?? '',
      staffId: ev.staffId ?? '',
      status: ev.status,
      cost: ev.cost ?? undefined,
      memo: ev.memo ?? '',
    });
    setFormError('');
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  function handleSave() {
    if (!form.eventName.trim()) {
      setFormError('催事名は必須です');
      return;
    }
    setFormError('');
    startTransition(async () => {
      const result = editingId
        ? await updateEvent(editingId, form)
        : await createEvent(form);

      if (result.success) {
        // Refresh list from server (simple reload approach)
        window.location.reload();
      } else {
        setFormError(result.error ?? '保存に失敗しました');
      }
    });
  }

  return (
    <div id="events" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h1 text-text-primary">会場マスタ</h2>
        <Button onClick={openNew} size="md">
          <Plus className="size-4" />
          会場を追加
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 px-4 text-left font-medium">会場名</th>
              <th className="h-9 px-4 text-left font-medium">住所</th>
              <th className="h-9 px-4 text-left font-medium">催事日</th>
              <th className="h-9 px-4 text-left font-medium">エリア</th>
              <th className="h-9 px-4 text-left font-medium">担当者</th>
              <th className="h-9 px-4 text-left font-medium">ステータス</th>
              <th className="h-9 px-4 text-right font-medium tabular-nums">コスト</th>
              <th className="h-9 px-4 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-10 px-4 text-center text-text-tertiary">
                  会場がありません
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                  <td className="px-4 font-medium text-text-primary">{ev.eventName}</td>
                  <td className="px-4 text-text-secondary">{ev.venueAddress ?? '—'}</td>
                  <td className="px-4 tabular-nums text-text-secondary">
                    {formatDate(ev.eventDate)}
                  </td>
                  <td className="px-4 text-text-secondary">{ev.area ?? '—'}</td>
                  <td className="px-4 text-text-secondary">{ev.staffName ?? '—'}</td>
                  <td className="px-4">
                    <Badge tone={ev.status === 'disabled' ? 'neutral' : ev.status === 'closed' ? 'warning' : 'success'}>
                      {EVENT_STATUS_LABELS[ev.status] ?? ev.status}
                    </Badge>
                  </td>
                  <td className="px-4 text-right tabular-nums text-text-secondary">
                    {ev.cost != null ? `${ev.cost.toLocaleString('ja-JP')}円` : '—'}
                  </td>
                  <td className="px-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ev)}>
                      編集
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingId ? '会場を編集' : '会場を追加'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSheet}>
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
            <Label htmlFor="event-name" required>
              催事名
            </Label>
            <Input
              id="event-name"
              value={form.eventName}
              onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
              placeholder="例: イオンモール○○ 催事"
            />
          </div>
          <div>
            <Label htmlFor="venue-name">会場名</Label>
            <Input
              id="venue-name"
              value={form.venueName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))}
              placeholder="例: イオンモール○○"
            />
          </div>
          <div>
            <Label htmlFor="venue-address">住所</Label>
            <Input
              id="venue-address"
              value={form.venueAddress ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, venueAddress: e.target.value }))}
              placeholder="例: 東京都渋谷区○○1-2-3"
            />
          </div>
          <div>
            <Label htmlFor="event-date">催事日</Label>
            <Input
              id="event-date"
              type="date"
              value={form.eventDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="event-area">エリア</Label>
            <Input
              id="event-area"
              value={form.area ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              placeholder="例: 東京・神奈川"
            />
          </div>
          <div>
            <Label htmlFor="event-staff">担当者</Label>
            <select
              id="event-staff"
              value={form.staffId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
              className="mt-1 flex h-9 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">未割当</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="event-status">ステータス</Label>
            <select
              id="event-status"
              value={form.status ?? 'active'}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1 flex h-9 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {EVENT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="event-cost">コスト（円）</Label>
            <Input
              id="event-cost"
              type="number"
              value={form.cost ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cost: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              placeholder="0"
              className="tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="event-memo">メモ</Label>
            <textarea
              id="event-memo"
              value={form.memo ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              rows={3}
              placeholder="備考など"
              className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
            />
          </div>

          {formError && (
            <p className="text-xs text-status-error" role="alert">
              {formError}
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
