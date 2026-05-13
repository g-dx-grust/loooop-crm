'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus } from 'lucide-react';
import type { CrossSellRow } from '@looop/db';
import { PRODUCT_TYPES, CROSS_SELL_STATUSES, INTEREST_RANKS } from '@/lib/constants';
import {
  PRODUCT_TYPE_LABELS,
  CROSS_SELL_STATUS_LABELS,
  CROSS_SELL_STATUS_TONE,
} from '@/lib/status-labels';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { upsertCrossSellOpportunity, type UpsertCrossSellInput } from './actions';
import { AiScoreCell } from './ai-score-cell';

// ---------------------------------------------------------------------------
// ローカル定数
// ---------------------------------------------------------------------------

const INTEREST_RANK_LABELS: Record<string, string> = {
  A: 'A（高）',
  B: 'B（中）',
  C: 'C（低）',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CrossSellTabProps {
  customerId: string;
  opportunities: CrossSellRow[];
}

// ---------------------------------------------------------------------------
// フォーム初期値ヘルパー
// ---------------------------------------------------------------------------

function buildDefaultForm(
  productType: string,
  existing: CrossSellRow | undefined,
): UpsertCrossSellInput {
  if (existing) {
    return {
      productType: existing.productType,
      status: existing.status,
      interestRank: existing.interestRank ?? undefined,
      nextActionDate: existing.nextActionDate ?? undefined,
      expectedRevenue: existing.expectedRevenue ?? undefined,
      memo: existing.memo ?? undefined,
    };
  }
  return {
    productType,
    status: 'not_proposed',
    interestRank: undefined,
    nextActionDate: undefined,
    expectedRevenue: undefined,
    memo: undefined,
  };
}

// ---------------------------------------------------------------------------
// CrossSellTab
// ---------------------------------------------------------------------------

export function CrossSellTab({ customerId, opportunities }: CrossSellTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 現在編集中の商材 productType
  const [editingProduct, setEditingProduct] = useState<string | null>(null);

  // 楽観的更新用（保存後 router.refresh() で同期）
  const [optimisticOps] = useState<CrossSellRow[]>(opportunities);

  // フォーム状態
  const [form, setForm] = useState<UpsertCrossSellInput>({
    productType: '',
    status: 'not_proposed',
  });

  // -----------------------------------------------------------------------
  // Sheet を開く
  // -----------------------------------------------------------------------

  const openSheet = (productType: string) => {
    const existing = optimisticOps.find((o) => o.productType === productType);
    setForm(buildDefaultForm(productType, existing));
    setEditingProduct(productType);
  };

  const closeSheet = () => {
    setEditingProduct(null);
  };

  // -----------------------------------------------------------------------
  // 保存
  // -----------------------------------------------------------------------

  const handleSave = () => {
    startTransition(async () => {
      await upsertCrossSellOpportunity(customerId, form);
      router.refresh();
      setEditingProduct(null);
    });
  };

  // -----------------------------------------------------------------------
  // フォーム更新ヘルパー
  // -----------------------------------------------------------------------

  const updateForm = <K extends keyof UpsertCrossSellInput>(
    key: K,
    value: UpsertCrossSellInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // Sheet タイトル
  // -----------------------------------------------------------------------

  const sheetTitle = editingProduct
    ? `${PRODUCT_TYPE_LABELS[editingProduct] ?? editingProduct}の編集`
    : '';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
                商材
              </th>
              <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
                見込み度
              </th>
              <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
                ステータス
              </th>
              <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
                次回アクション日
              </th>
              <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">
                AIスコア
              </th>
              <th className="h-9 w-14 px-3 text-right text-xs font-semibold text-text-secondary">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {PRODUCT_TYPES.map((productType) => {
              const opp = optimisticOps.find((o) => o.productType === productType);
              const statusKey = opp?.status ?? 'not_proposed';
              const statusLabel = CROSS_SELL_STATUS_LABELS[statusKey] ?? statusKey;
              const statusTone: BadgeTone = CROSS_SELL_STATUS_TONE[statusKey] ?? 'neutral';
              const interestLabel = opp?.interestRank
                ? (INTEREST_RANK_LABELS[opp.interestRank] ?? opp.interestRank)
                : '—';
              const nextActionLabel = opp?.nextActionDate
                ? new Date(opp.nextActionDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })
                : '—';

              return (
                <tr
                  key={productType}
                  className="h-10 border-b border-border hover:bg-bg-subtle"
                >
                  {/* 商材 */}
                  <td className="px-3 text-sm font-medium text-text-primary">
                    {PRODUCT_TYPE_LABELS[productType] ?? productType}
                  </td>

                  {/* 見込み度 */}
                  <td className="px-3 text-sm text-text-secondary">{interestLabel}</td>

                  {/* ステータス */}
                  <td className="px-3">
                    <Badge tone={statusTone}>{statusLabel}</Badge>
                  </td>

                  {/* 次回アクション日 */}
                  <td className="px-3 font-tabular-nums text-sm text-text-secondary">
                    {nextActionLabel}
                  </td>

                  {/* AIスコア */}
                  <td className="px-3">
                    {opp ? (
                      <AiScoreCell
                        opportunityId={opp.id}
                        customerId={customerId}
                        aiScore={opp.aiScore ?? null}
                        aiScoreReason={opp.aiScoreReason ?? null}
                      />
                    ) : (
                      <span className="text-sm text-text-tertiary">—</span>
                    )}
                  </td>

                  {/* 操作 */}
                  <td className="px-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openSheet(productType)}
                      aria-label={`${PRODUCT_TYPE_LABELS[productType] ?? productType}を編集`}
                      className="h-7 w-7 p-0"
                    >
                      {opp ? (
                        <Pencil size={14} aria-hidden />
                      ) : (
                        <Plus size={14} aria-hidden />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 編集 Sheet */}
      <Sheet
        open={editingProduct !== null}
        onClose={closeSheet}
        title={sheetTitle}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={closeSheet}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSave}
              loading={isPending}
            >
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* ステータス */}
          <div className="space-y-1">
            <label
              htmlFor="cross-sell-status"
              className="block text-sm font-medium text-text-primary"
            >
              ステータス <span className="text-status-error" aria-hidden>*</span>
            </label>
            <select
              id="cross-sell-status"
              value={form.status}
              onChange={(e) => updateForm('status', e.target.value)}
              required
              className="flex h-8 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              {CROSS_SELL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CROSS_SELL_STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          {/* 見込み度 */}
          <div className="space-y-1">
            <label
              htmlFor="cross-sell-interest-rank"
              className="block text-sm font-medium text-text-primary"
            >
              見込み度 <span className="text-text-tertiary text-xs font-normal">（任意）</span>
            </label>
            <select
              id="cross-sell-interest-rank"
              value={form.interestRank ?? ''}
              onChange={(e) =>
                updateForm('interestRank', e.target.value !== '' ? e.target.value : undefined)
              }
              className="flex h-8 w-full rounded border border-border bg-white px-3 py-1 text-sm text-text-primary focus-visible:border-brand-primary focus-visible:outline-none"
            >
              <option value="">未設定</option>
              {INTEREST_RANKS.map((r) => (
                <option key={r} value={r}>
                  {INTEREST_RANK_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>

          {/* 次回アクション日 */}
          <div className="space-y-1">
            <label
              htmlFor="cross-sell-next-action-date"
              className="block text-sm font-medium text-text-primary"
            >
              次回アクション日{' '}
              <span className="text-xs font-normal text-text-tertiary">（任意）</span>
            </label>
            <Input
              id="cross-sell-next-action-date"
              type="date"
              value={form.nextActionDate ?? ''}
              onChange={(e) =>
                updateForm('nextActionDate', e.target.value !== '' ? e.target.value : undefined)
              }
              className="font-tabular-nums"
            />
          </div>

          {/* 想定売上 */}
          <div className="space-y-1">
            <label
              htmlFor="cross-sell-expected-revenue"
              className="block text-sm font-medium text-text-primary"
            >
              想定売上{' '}
              <span className="text-xs font-normal text-text-tertiary">（任意・円）</span>
            </label>
            <Input
              id="cross-sell-expected-revenue"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.expectedRevenue ?? ''}
              onChange={(e) =>
                updateForm(
                  'expectedRevenue',
                  e.target.value !== '' ? Number(e.target.value) : undefined,
                )
              }
              placeholder="例: 300000"
              className="font-tabular-nums"
            />
          </div>

          {/* メモ */}
          <div className="space-y-1">
            <label
              htmlFor="cross-sell-memo"
              className="block text-sm font-medium text-text-primary"
            >
              メモ{' '}
              <span className="text-xs font-normal text-text-tertiary">（任意）</span>
            </label>
            <textarea
              id="cross-sell-memo"
              rows={3}
              value={form.memo ?? ''}
              onChange={(e) =>
                updateForm('memo', e.target.value !== '' ? e.target.value : undefined)
              }
              placeholder="商談メモ、顧客の反応など"
              className="w-full rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-bg-muted"
            />
          </div>
        </div>
      </Sheet>
    </>
  );
}
