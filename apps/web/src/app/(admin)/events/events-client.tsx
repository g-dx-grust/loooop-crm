'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { EventFormSheet } from './event-form';
import { EventCostSheet } from './event-cost-sheet';
import { deleteEvent } from './actions';
import type { EventWithCount } from './actions';

const STATUS_LABELS: Record<string, string> = {
  active:    '有効',
  scheduled: '予定',
  cancelled: 'キャンセル',
};
const STATUS_COLORS: Record<string, string> = {
  active:    'bg-[#E8F8EE] text-[#00913A]',
  scheduled: 'bg-[#FFF3E0] text-[#E65100]',
  cancelled: 'bg-[#FFEBEE] text-[#C62828]',
};

interface Props {
  initialEvents: EventWithCount[];
}

export function EventsClient({ initialEvents }: Props) {
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [costSheetOpen, setCostSheetOpen] = useState(false);
  const [editing, setEditing]       = useState<EventWithCount | null>(null);
  const [costEvent, setCostEvent]   = useState<EventWithCount | null>(null);
  const { showToast }               = useToast();
  const [isPending, startTransition] = useTransition();

  function openCreate() { setEditing(null); setSheetOpen(true); }
  function openEdit(ev: EventWithCount) { setEditing(ev); setSheetOpen(true); }
  function openCost(ev: EventWithCount) { setCostEvent(ev); setCostSheetOpen(true); }

  function handleDelete(ev: EventWithCount) {
    if (!confirm(`「${ev.eventName}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteEvent(ev.id);
      if (result.success) {
        showToast('削除しました。', 'success');
      } else {
        showToast(result.error ?? '削除に失敗しました。', 'error');
      }
    });
  }

  const events = initialEvents;

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={openCreate} className="gap-1.5" size="sm">
          <Plus size={15} aria-hidden />
          新規登録
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">種別</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">会場名</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">条件</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">催事名（管理用）</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">エリア</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">参考日</th>
                <th className="h-9 whitespace-nowrap px-3 text-right font-medium">獲得数</th>
                <th className="h-9 whitespace-nowrap px-3 text-left font-medium">ステータス</th>
                <th className="h-9 w-24 px-3" />
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-10 px-4 text-center text-text-tertiary">
                    登録された催事・テレマがありません
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="h-10 border-b border-border hover:bg-bg-subtle">
                    <td className="whitespace-nowrap px-3">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ev.sourceType === 'telema' ? 'bg-[#EDE7F6] text-[#4527A0]' : 'bg-brand-primarySoft text-brand-primary'}`}>
                        {ev.sourceType === 'telema' ? 'テレマ' : '催事'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 font-medium text-text-primary">{ev.venueName ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 text-text-secondary">{ev.condition ?? '—'}</td>
                    <td className="max-w-[200px] truncate px-3 text-text-secondary">{ev.eventName}</td>
                    <td className="whitespace-nowrap px-3 text-text-secondary">{ev.area ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">{ev.eventDate ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums font-medium text-text-primary">
                      {ev.acquisitionCount > 0 ? ev.acquisitionCount : <span className="text-text-tertiary">0</span>}
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ev.status] ?? ''}`}>
                        {STATUS_LABELS[ev.status] ?? ev.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCost(ev)}
                          className="flex size-7 items-center justify-center rounded text-text-tertiary hover:bg-bg-subtle hover:text-text-primary"
                          aria-label="費用管理"
                          title="費用管理"
                        >
                          <ReceiptText size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(ev)}
                          className="flex size-7 items-center justify-center rounded text-text-tertiary hover:bg-bg-subtle hover:text-text-primary"
                          aria-label="編集"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={isPending}
                          className="flex size-7 items-center justify-center rounded text-text-tertiary hover:bg-[#FFEBEE] hover:text-status-error disabled:opacity-50"
                          aria-label="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EventFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editing}
      />

      <EventCostSheet
        open={costSheetOpen}
        onClose={() => setCostSheetOpen(false)}
        event={costEvent}
      />
    </>
  );
}
