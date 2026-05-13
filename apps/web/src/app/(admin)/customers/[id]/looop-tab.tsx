'use client';

// Client component: Looop tab with status change button

import { useState } from 'react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type LooopContractRow } from '@looop/db';
import { LooopStatusModal } from './looop-status-modal';
import { LOOOP_STATUS_LABELS } from '../customer-filters';
import { format } from 'date-fns';

function looopStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'contracted':
    case 'opened':
      return 'success';
    case 'applied':
    case 'under_review':
      return 'info';
    case 'cancelled':
      return 'error';
    case 'not_proposed':
    case 'excluded':
      return 'neutral';
    case 'proposed':
    case 'interested':
      return 'warning';
    default:
      return 'neutral';
  }
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unbilled: '未請求',
  billed: '請求済み',
  paid: '入金済み',
};

interface LooopTabProps {
  contracts: LooopContractRow[];
}

export function LooopTab({ contracts }: LooopTabProps) {
  const [modalContractId, setModalContractId] = useState<string | null>(null);

  if (contracts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-tertiary">
        Looop申込情報はありません
      </div>
    );
  }

  const modalContract = contracts.find((c) => c.id === modalContractId);

  return (
    <>
      <div className="space-y-4">
        {contracts.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge tone={looopStatusTone(c.status)}>
                  {LOOOP_STATUS_LABELS[c.status] ?? c.status}
                </Badge>
                {c.applicationId ? (
                  <span className="tabular-nums text-xs text-text-tertiary">#{c.applicationId}</span>
                ) : null}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalContractId(c.id)}
              >
                ステータス変更
              </Button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {c.currentPowerCompany ? (
                <>
                  <dt className="text-text-secondary">現在の電力会社</dt>
                  <dd className="text-text-primary">{c.currentPowerCompany}</dd>
                </>
              ) : null}
              {c.monthlyElectricBill != null ? (
                <>
                  <dt className="text-text-secondary">月間の電気料金</dt>
                  <dd className="tabular-nums text-text-primary">
                    ¥{c.monthlyElectricBill.toLocaleString('ja-JP')}
                  </dd>
                </>
              ) : null}
              {c.wattage != null ? (
                <>
                  <dt className="text-text-secondary">ワット数</dt>
                  <dd className="tabular-nums text-text-primary">
                    {c.wattage.toLocaleString('ja-JP')}W
                  </dd>
                </>
              ) : null}
              {c.billUsageMonth ? (
                <>
                  <dt className="text-text-secondary">明細の利用月</dt>
                  <dd className="tabular-nums text-text-primary">{c.billUsageMonth}</dd>
                </>
              ) : null}
              {c.unitPrice != null ? (
                <>
                  <dt className="text-text-secondary">単価</dt>
                  <dd className="tabular-nums text-text-primary">
                    ¥{c.unitPrice.toLocaleString('ja-JP')}
                  </dd>
                </>
              ) : null}
              {c.applicationDate ? (
                <>
                  <dt className="text-text-secondary">申込日</dt>
                  <dd className="tabular-nums text-text-primary">{c.applicationDate}</dd>
                </>
              ) : null}
              {c.contractDate ? (
                <>
                  <dt className="text-text-secondary">契約日</dt>
                  <dd className="tabular-nums text-text-primary">{c.contractDate}</dd>
                </>
              ) : null}
              {c.openedDate ? (
                <>
                  <dt className="text-text-secondary">開通日</dt>
                  <dd className="tabular-nums text-text-primary">{c.openedDate}</dd>
                </>
              ) : null}
              {c.revenueMonth ? (
                <>
                  <dt className="text-text-secondary">売上計上月</dt>
                  <dd className="tabular-nums text-text-primary">{c.revenueMonth}</dd>
                </>
              ) : null}
              <dt className="text-text-secondary">支払いステータス</dt>
              <dd>
                <Badge tone={c.paymentStatus === 'paid' ? 'success' : c.paymentStatus === 'billed' ? 'info' : 'neutral'}>
                  {PAYMENT_STATUS_LABELS[c.paymentStatus] ?? c.paymentStatus}
                </Badge>
              </dd>
              {c.cancelReason ? (
                <>
                  <dt className="text-text-secondary">キャンセル理由</dt>
                  <dd className="text-text-primary">{c.cancelReason}</dd>
                </>
              ) : null}
              <dt className="text-text-secondary">登録日</dt>
              <dd className="tabular-nums text-text-primary">
                {c.createdAt ? format(new Date(c.createdAt), 'yyyy年M月d日') : '—'}
              </dd>
            </dl>
          </div>
        ))}
      </div>

      {modalContractId && modalContract ? (
        <LooopStatusModal
          contractId={modalContractId}
          currentStatus={modalContract.status}
          onClose={() => setModalContractId(null)}
        />
      ) : null}
    </>
  );
}
