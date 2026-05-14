'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import type { AuditLogRow } from './queries';

const ACTION_LABELS: Record<string, string> = {
  login: 'ログイン',
  logout: 'ログアウト',
  create_customer: '顧客登録',
  update_customer: '顧客更新',
  delete_customer: '顧客削除',
  export_csv: 'CSV出力',
  consent_grant: '同意取得',
  consent_withdraw: '同意撤回',
  update_looop_status: 'Looopステータス更新',
  create_event: '会場登録',
  update_event: '会場更新',
  update_cross_sell: 'クロスセル更新',
  view_customer_detail: '顧客詳細閲覧',
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

interface SearchState {
  search: string;
  from: string;
  to: string;
}

interface Props {
  initialRows: AuditLogRow[];
  initialTotal: number;
}

export function AuditSection({ initialRows, initialTotal }: Props) {
  const [rows, setRows] = useState<AuditLogRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<SearchState>({ search: '', from: '', to: '' });
  const [applied, setApplied] = useState<SearchState>({ search: '', from: '', to: '' });
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / 100));

  function handleSearch() {
    setApplied(form);
    setPage(1);
    fetchRows(form, 1);
  }

  function fetchRows(filters: SearchState, p: number) {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      params.set('page', String(p));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { rows: AuditLogRow[]; total: number };
        setRows(data.rows);
        setTotal(data.total);
      }
    });
  }

  function goPage(p: number) {
    setPage(p);
    fetchRows(applied, p);
  }

  return (
    <div id="audit" className="space-y-4">
      <h2 className="text-h1 text-text-primary">監査ログ</h2>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <Label htmlFor="audit-search">キーワード</Label>
          <Input
            id="audit-search"
            placeholder="アクション・リソース種別"
            value={form.search}
            onChange={(e) => setForm((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div>
          <Label htmlFor="audit-from">開始日</Label>
          <Input
            id="audit-from"
            type="date"
            value={form.from}
            onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="audit-to">終了日</Label>
          <Input
            id="audit-to"
            type="date"
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <Button onClick={handleSearch} loading={isPending}>
          検索
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium tabular-nums">ID</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">操作者</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">アクション</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">リソース種別</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">リソースID</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">IPアドレス</th>
              <th className="h-9 whitespace-nowrap px-3 text-left font-medium">日時</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-10 px-3 text-center text-text-tertiary">
                  データがありません
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="h-10 cursor-pointer border-b border-border hover:bg-bg-subtle"
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="whitespace-nowrap px-3 tabular-nums text-text-tertiary">{row.id}</td>
                  <td className="whitespace-nowrap px-3 text-text-secondary">{row.actorName ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 text-text-primary">{formatAction(row.action)}</td>
                  <td className="whitespace-nowrap px-3 text-text-secondary">{row.resourceType ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 font-mono text-xs text-text-tertiary">
                    {row.resourceId ? row.resourceId.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">{row.ipAddress ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 tabular-nums text-text-secondary">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Tokyo',
                        })
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="tabular-nums">
            {page} / {totalPages} ページ（計 {total.toLocaleString('ja-JP')} 件）
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
          >
            前へ
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
          >
            次へ
          </Button>
        </div>
      )}

      {/* Diff dialog */}
      <Dialog
        open={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        title="差分データ"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedRow(null)}>
              閉じる
            </Button>
          </div>
        }
      >
        {selectedRow && (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">
              アクション: <span className="text-text-primary">{formatAction(selectedRow.action)}</span>
            </p>
            <pre className="max-h-64 overflow-auto rounded border border-border bg-bg-subtle p-3 text-xs text-text-primary">
              <code>{JSON.stringify(selectedRow.diff, null, 2)}</code>
            </pre>
          </div>
        )}
      </Dialog>
    </div>
  );
}
