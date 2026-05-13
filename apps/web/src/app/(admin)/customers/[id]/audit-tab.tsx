// Server component (no 'use client' needed — pure display)
import { format } from 'date-fns';
import type { AuditLogRow } from '@looop/db';

interface AuditTabProps {
  entries: AuditLogRow[];
}

const ACTION_LABELS: Record<string, string> = {
  'activity.create': '対応記録',
  'consent.revoke': '同意撤回',
  'looop_contract.status_change': 'Looopステータス変更',
  'cross_sell.create': 'クロスセル追加',
  'cross_sell.update': 'クロスセル更新',
  'customer.update': '顧客情報更新',
};

function formatDiff(diff: unknown): string {
  if (diff === null || diff === undefined) return '—';
  const str = JSON.stringify(diff);
  return str.length > 100 ? `${str.slice(0, 100)}…` : str;
}

export function AuditTab({ entries }: AuditTabProps) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-tertiary">監査ログはありません</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-subtle">
            <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
              日時
            </th>
            <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
              アクション
            </th>
            <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
              リソース種別
            </th>
            <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
              変更内容
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="h-10 border-b border-border hover:bg-bg-subtle">
              <td className="whitespace-nowrap px-3 font-feature-tnum text-xs tabular-nums text-text-secondary">
                {entry.createdAt
                  ? format(new Date(entry.createdAt), 'yyyy/MM/dd HH:mm')
                  : '—'}
              </td>
              <td className="px-3 text-sm text-text-primary">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </td>
              <td className="px-3 text-sm text-text-secondary">
                {entry.resourceType ?? '—'}
              </td>
              <td className="max-w-xs truncate px-3 font-mono text-xs text-text-tertiary">
                {formatDiff(entry.diff)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
