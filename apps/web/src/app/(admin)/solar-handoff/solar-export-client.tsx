'use client';

// Client component: checkbox selection + confirmation dialog + CSV download

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { exportSolarCsv } from './actions';
import type { SolarEligibleCustomer } from './queries';
import type { PartnerCompanyRow } from '@looop/db';

interface Props {
  customers: SolarEligibleCustomer[];
  partners: PartnerCompanyRow[];
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  count,
  partnerName,
  consentVersions,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  partnerName: string;
  consentVersions: string[];
  isPending: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(29,33,41,0.40)]" onClick={!isPending ? onClose : undefined} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-label="CSV出力の確認"
        className="relative w-full max-w-sm rounded-lg bg-white shadow-overlay"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-h1 text-text-primary">CSV出力の確認</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-start gap-2 rounded border border-status-warning bg-[#FFF7EC] p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
            <p className="text-sm text-text-primary">
              個人情報を含む CSV を出力します。取り扱いには十分ご注意ください。
            </p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">出力件数</dt>
              <dd className="tabular-nums font-medium text-text-primary">{count.toLocaleString('ja-JP')} 件</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">出力先会社</dt>
              <dd className="font-medium text-text-primary">{partnerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">同意バージョン</dt>
              <dd className="font-medium text-text-primary">{consentVersions.join(', ')}</dd>
            </div>
          </dl>
          <p className="text-xs text-text-tertiary">
            出力後、操作ログに記録されます。
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} loading={isPending}>
            <Download className="size-4" />
            出力する
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SolarExportClient({ customers: eligibleCustomers, partners }: Props) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = eligibleCustomers.length > 0 && selected.size === eligibleCustomers.length;
  const partnerName = partners.find((p) => p.id === partnerId)?.name ?? '';
  const selectedCustomers = eligibleCustomers.filter((c) => selected.has(c.id));
  const consentVersions = [...new Set(selectedCustomers.map((c) => c.consentTextVersion))];

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleCustomers.map((c) => c.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExportConfirm() {
    startTransition(async () => {
      const result = await exportSolarCsv({
        customerIds: [...selected],
        partnerId,
        partnerName,
      });

      setDialogOpen(false);

      if (!result.success || !result.csvContent) {
        showToast(result.error ?? 'CSV出力に失敗しました', 'error');
        return;
      }

      // Trigger browser download
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      a.download = `solar_handoff_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`${result.recordCount ?? 0} 件を CSV 出力しました`, 'success');
      setSelected(new Set());
    });
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 lg:px-6">
        <span className="text-xs text-text-tertiary tabular-nums">
          対象 {eligibleCustomers.length.toLocaleString('ja-JP')} 件
        </span>
        {selected.size > 0 && (
          <Badge tone="info">{selected.size.toLocaleString('ja-JP')} 件選択中</Badge>
        )}
        <div className="ml-auto flex items-center gap-3">
          {/* Partner selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="partner-select" className="text-sm text-text-secondary">
              出力先
            </label>
            <select
              id="partner-select"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="h-8 rounded border border-border bg-white px-2 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {partners.length === 0 ? (
                <option value="">パートナーなし</option>
              ) : (
                partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <Button
            variant="primary"
            disabled={selected.size === 0 || !partnerId}
            onClick={() => setDialogOpen(true)}
          >
            <Download className="size-4" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="p-4 lg:p-6">
        {eligibleCustomers.length === 0 ? (
          <div className="rounded-lg border border-border bg-white py-16 text-center">
            <p className="text-sm text-text-tertiary">
              太陽光連携の対象顧客がいません。
              <br />
              同意取得済み・ピン確認済みの顧客が対象です。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="h-9 w-10 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="全件選択"
                      className="size-4 cursor-pointer accent-brand-primary"
                    />
                  </th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">顧客ID</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">氏名</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">電話番号</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">メール / 生年月日</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">住所</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">でんき情報</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">担当 / 会場</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">同意日時</th>
                  <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">同意Ver.</th>
                  <th className="h-9 px-3 text-center text-xs font-semibold text-text-secondary">ピン</th>
                </tr>
              </thead>
              <tbody>
                {eligibleCustomers.map((c) => {
                  const isSelected = selected.has(c.id);
                  const addressSummary = [c.prefecture, c.city, c.street].filter(Boolean).join('');
                  const consentDate = new Date(c.consentedAt);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => toggleRow(c.id)}
                      className={cn(
                        'h-10 cursor-pointer border-b border-border last:border-0',
                        isSelected ? 'bg-brand-primarySoft' : 'hover:bg-bg-subtle',
                      )}
                    >
                      <td className="px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 cursor-pointer accent-brand-primary"
                          aria-label={`${c.name} を選択`}
                        />
                      </td>
                      <td className="px-3">
                        <Link
                          href={`/customers/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="tabular-nums text-xs text-text-tertiary hover:text-brand-primary hover:underline"
                        >
                          {c.displayId}
                        </Link>
                      </td>
                      <td className="px-3">
                        <span className="font-medium text-text-primary">{c.name}</span>
                        {c.kana ? (
                          <span className="ml-1.5 text-xs text-text-tertiary">{c.kana}</span>
                        ) : null}
                      </td>
                      <td className="px-3">
                        <span className="tabular-nums text-text-secondary">
                          {c.phoneEnc}
                        </span>
                      </td>
                      <td className="px-3">
                        <div className="flex flex-col">
                          {c.emailEnc ? (
                            <span className="max-w-[180px] truncate text-xs text-text-secondary">
                              {c.emailEnc}
                            </span>
                          ) : null}
                          {c.birthDate ? (
                            <span className="tabular-nums text-xs text-text-tertiary">
                              {c.birthDate}
                            </span>
                          ) : null}
                          {!c.emailEnc && !c.birthDate ? (
                            <span className="text-text-disabled">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3">
                        <span className="text-text-secondary">
                          {addressSummary || <span className="text-text-disabled">—</span>}
                        </span>
                      </td>
                      <td className="px-3">
                        {c.monthlyElectricBill != null || c.wattage != null || c.billUsageMonth ? (
                          <div className="flex flex-col text-xs">
                            {c.monthlyElectricBill != null ? (
                              <span className="tabular-nums text-text-primary">
                                ¥{c.monthlyElectricBill.toLocaleString('ja-JP')}
                              </span>
                            ) : null}
                            {c.wattage != null ? (
                              <span className="tabular-nums text-text-secondary">
                                {c.wattage.toLocaleString('ja-JP')}W
                              </span>
                            ) : null}
                            {c.billUsageMonth ? (
                              <span className="tabular-nums text-text-tertiary">
                                {c.billUsageMonth}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-text-disabled">—</span>
                        )}
                      </td>
                      <td className="px-3">
                        <div className="text-xs text-text-secondary">
                          {c.staffName ?? <span className="text-text-disabled">—</span>}
                          {c.eventName ? (
                            <span className="ml-1 text-text-tertiary">/ {c.eventName}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3">
                        <span className="tabular-nums text-xs text-text-secondary">
                          {consentDate.toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-3">
                        <span className="text-xs text-text-tertiary">{c.consentTextVersion}</span>
                      </td>
                      <td className="px-3 text-center">
                        <Check className="mx-auto size-4 text-status-success" aria-label="ピン確認済み" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleExportConfirm}
        count={selected.size}
        partnerName={partnerName}
        consentVersions={consentVersions}
        isPending={isPending}
      />
    </>
  );
}
