'use client';

// Client component: 太陽光連携 tab with consent revoke

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PartnerHandoffRow, type PartnerCompanyRow, type ConsentRow } from '@looop/db';
import { ConsentRevokeDialog } from './consent-revoke-dialog';
import { format } from 'date-fns';

const HANDOFF_STATUS_LABELS: Record<string, string> = {
  not_proposed: '未提案',
  interested: '興味あり',
  consent_obtained: '同意取得済み',
  pending: '連携待ち',
  handed_off: '連携済み',
  partner_called: 'パートナー架電済み',
  appointment: 'アポ確定',
  negotiating: '商談中',
  won: '成約',
  lost: '失注',
  excluded: '対象外',
  consent_withdrawn: '同意撤回',
};

function handoffTone(status: string): BadgeTone {
  switch (status) {
    case 'won':
      return 'success';
    case 'handed_off':
    case 'partner_called':
    case 'appointment':
    case 'negotiating':
      return 'info';
    case 'lost':
    case 'consent_withdrawn':
      return 'error';
    case 'not_proposed':
    case 'excluded':
      return 'neutral';
    default:
      return 'warning';
  }
}

interface SolarTabProps {
  customerId: string;
  hasConsent: boolean;
  handoffs: (PartnerHandoffRow & { partnerCompany: PartnerCompanyRow | null })[];
  consents: ConsentRow[];
}

export function SolarTab({ customerId, hasConsent, handoffs, consents }: SolarTabProps) {
  const [revokeOpen, setRevokeOpen] = useState(false);

  const latestConsent = consents
    .filter((c) => c.consentType === 'solar_partner_share')
    .sort((a, b) => {
      const dateA = new Date(a.consentedAt).getTime();
      const dateB = new Date(b.consentedAt).getTime();
      return dateB - dateA;
    })[0];

  return (
    <>
      {/* Consent status */}
      {!hasConsent ? (
        <div className="mb-4 flex items-start gap-2 rounded border border-status-error bg-status-errorSoft px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-error" aria-hidden />
          <p className="text-sm text-status-error">
            第三者提供同意が取得されていません。太陽光パートナーへの連携はできません。
          </p>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between rounded border border-border bg-white p-3">
          <div className="flex items-center gap-2">
            <Badge tone="success">同意取得済み</Badge>
            {latestConsent?.consentedAt ? (
              <span className="tabular-nums text-xs text-text-tertiary">
                {format(new Date(latestConsent.consentedAt), 'yyyy年M月d日')}
              </span>
            ) : null}
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setRevokeOpen(true)}
          >
            同意を撤回する
          </Button>
        </div>
      )}

      {/* Handoff list */}
      {handoffs.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-tertiary">
          連携履歴はありません
        </div>
      ) : (
        <div className="space-y-3">
          {handoffs.map((h) => (
            <div key={h.id} className="rounded-lg border border-border bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={handoffTone(h.handoffStatus)}>
                  {HANDOFF_STATUS_LABELS[h.handoffStatus] ?? h.handoffStatus}
                </Badge>
                {h.partnerCompany ? (
                  <span className="text-sm font-medium text-text-primary">
                    {h.partnerCompany.name}
                  </span>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-text-secondary">連携日</dt>
                <dd className="tabular-nums text-text-primary">
                  {format(new Date(h.sharedAt), 'yyyy年M月d日')}
                </dd>
                {h.partnerResult ? (
                  <>
                    <dt className="text-text-secondary">パートナー結果</dt>
                    <dd className="text-text-primary">{h.partnerResult}</dd>
                  </>
                ) : null}
                {h.memo ? (
                  <>
                    <dt className="text-text-secondary">メモ</dt>
                    <dd className="text-text-primary">{h.memo}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}

      {revokeOpen ? (
        <ConsentRevokeDialog
          customerId={customerId}
          onClose={() => setRevokeOpen(false)}
        />
      ) : null}
    </>
  );
}
