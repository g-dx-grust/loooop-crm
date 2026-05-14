import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, MapPinOff, Check, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/page-header';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCustomerDetail, maskPhone } from '../queries';
import { DetailTabs, type TabKey } from './detail-tabs';
import { LooopTab } from './looop-tab';
import { SolarTab } from './solar-tab';
import { ActivityForm } from './activity-form';
import { CrossSellTab } from './cross-sell-tab';
import { BasicInfoTab } from './basic-info-tab';
import { AuditTab } from './audit-tab';
import { FileTab } from './file-tab';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: '電話',
  visit: '訪問',
  email: 'メール',
  memo: 'メモ',
  status_change: 'ステータス変更',
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  personal_info_use: '個人情報利用同意',
  solar_partner_share: '太陽光パートナー提供同意',
};


const ACCURACY_STATUS_LABELS: Record<string, string> = {
  unconfirmed: '未確認',
  google_auto: 'Google自動',
  customer_verified: '顧客確認済み',
  manually_corrected: '手動修正済み',
};

const DETAIL_TAB_KEYS = [
  '基本情報',
  '住所・地図',
  'Looop',
  'クロスセル',
  '太陽光連携',
  '同意履歴',
  '対応履歴',
  'ファイル',
  '監査',
] as const satisfies readonly TabKey[];

function consentStatusTone(status: string): BadgeTone {
  return status === 'granted' ? 'success' : 'error';
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCustomerDetail(id);

  if (!detail) notFound();

  // notFound() throws — detail is non-null below this point, but TypeScript can't narrow it
  // across closures, so we explicitly destructure here
  const {
    customer,
    address,
    allAddresses,
    event,
    staff,
    consents,
    activities,
    nextActionDate,
    looopContracts: customerContracts,
    crossSell,
    handoffs,
    customerFiles,
    auditLogEntries,
  } = detail;

  // Is solar consent active?
  const hasSolarConsent = consents.some(
    (c) =>
      c.consentType === 'solar_partner_share' &&
      c.consentStatus === 'granted' &&
      !c.withdrawnAt,
  );

  const phoneStr = customer.phoneEnc instanceof Uint8Array ? Buffer.from(customer.phoneEnc).toString('utf8') : customer.phoneEnc as string;
  const phoneSubStr = customer.phoneSubEnc instanceof Uint8Array ? Buffer.from(customer.phoneSubEnc).toString('utf8') : (customer.phoneSubEnc as string | null);
  const emailStr = customer.emailEnc instanceof Uint8Array ? Buffer.from(customer.emailEnc).toString('utf8') : (customer.emailEnc as string | null);
  const maskedPhone = maskPhone(phoneStr);

  function renderTabContent(activeTab: TabKey) {
    switch (activeTab) {
      case '基本情報':
        return (
          <BasicInfoTab
            customerId={customer.id}
            customer={{
              name: customer.name,
              kana: customer.kana,
              phoneEnc: phoneStr,
              phoneSubEnc: phoneSubStr,
              emailEnc: emailStr,
              birthDate: customer.birthDate,
              memo: customer.memo,
              currentMobileCarrier: customer.currentMobileCarrier ?? null,
              currentWifiCarrier: customer.currentWifiCarrier ?? null,
            }}
            maskedPhone={maskedPhone}
            maskedPhoneSub={phoneSubStr ? maskPhone(phoneSubStr) : null}
          />
        );

      case '住所・地図':
        return (
          <div className="space-y-4">
            {allAddresses.length === 0 ? (
              <p className="text-sm text-text-tertiary">住所情報がありません</p>
            ) : (
              allAddresses.map((addr) => (
                <div key={addr.id} className="rounded-lg border border-border bg-white p-4">
                  {addr.isPrimary ? (
                    <span className="mb-2 inline-flex items-center rounded bg-brand-primarySoft px-2 py-0.5 text-xs text-brand-primary">
                      メイン住所
                    </span>
                  ) : null}

                  <dl className="mt-2 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
                    {addr.postalCode ? (
                      <>
                        <dt className="text-text-secondary">郵便番号</dt>
                        <dd className="tabular-nums text-text-primary">〒{addr.postalCode}</dd>
                      </>
                    ) : null}

                    {addr.prefecture ? (
                      <>
                        <dt className="text-text-secondary">都道府県</dt>
                        <dd className="text-text-primary">{addr.prefecture}</dd>
                      </>
                    ) : null}

                    {addr.city ? (
                      <>
                        <dt className="text-text-secondary">市区町村</dt>
                        <dd className="text-text-primary">{addr.city}</dd>
                      </>
                    ) : null}

                    {addr.street ? (
                      <>
                        <dt className="text-text-secondary">番地</dt>
                        <dd className="text-text-primary">{addr.street}</dd>
                      </>
                    ) : null}

                    {addr.building ? (
                      <>
                        <dt className="text-text-secondary">建物名</dt>
                        <dd className="text-text-primary">{addr.building}</dd>
                      </>
                    ) : null}

                    <dt className="text-text-secondary">ピン確認</dt>
                    <dd>
                      {addr.pinConfirmed ? (
                        <span className="flex items-center gap-1 text-status-success">
                          <Check className="size-4" aria-hidden />
                          確認済み
                        </span>
                      ) : (
                        <Badge tone="warning" withDot={false}>
                          <MapPinOff className="size-3.5" aria-hidden />
                          ピン未確認
                        </Badge>
                      )}
                    </dd>

                    <dt className="text-text-secondary">精度</dt>
                    <dd className="text-text-primary">
                      {ACCURACY_STATUS_LABELS[addr.accuracyStatus] ?? addr.accuracyStatus}
                    </dd>

                    {addr.latitude != null && addr.longitude != null ? (
                      <>
                        <dt className="text-text-secondary">緯度 / 経度</dt>
                        <dd className="tabular-nums text-text-primary">
                          {Number(addr.latitude).toFixed(6)}, {Number(addr.longitude).toFixed(6)}
                        </dd>
                      </>
                    ) : null}
                  </dl>

                  {/* Google Maps */}
                  <div className="mt-4">
                    {addr.googleMapsUrl ? (
                      <div className="space-y-2">
                        <a
                          href={addr.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:underline"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          Google マップで開く
                        </a>
                        {addr.latitude != null && addr.longitude != null ? (
                          <iframe
                            title="Google マップ"
                            width="100%"
                            className="aspect-video rounded"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}&q=${addr.latitude},${addr.longitude}&zoom=16`}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <Badge tone="warning">
                        <MapPinOff className="size-3.5" aria-hidden />
                        ピン未確認 — マップURLなし
                      </Badge>
                    )}
                    <div className="mt-3">
                      <Link href={`/intake?customerId=${customer.id}&step=address`}>
                        <Button variant="secondary" size="sm">
                          <MapPin className="size-4" />
                          ピン位置を修正
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'Looop':
        return <LooopTab contracts={customerContracts} />;

      case 'クロスセル':
        return <CrossSellTab customerId={customer.id} opportunities={crossSell} />;

      case '太陽光連携':
        return (
          <SolarTab
            customerId={customer.id}
            hasConsent={hasSolarConsent}
            handoffs={handoffs}
            consents={consents}
          />
        );

      case '同意履歴':
        return (
          <div className="space-y-3">
            {consents.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-tertiary">同意履歴はありません</p>
            ) : (
              consents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between rounded-lg border border-border bg-white p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={consentStatusTone(c.consentStatus)}>
                        {c.consentStatus === 'granted' ? '取得' : '撤回'}
                      </Badge>
                      <span className="text-sm font-medium text-text-primary">
                        {CONSENT_TYPE_LABELS[c.consentType] ?? c.consentType}
                      </span>
                    </div>
                    <p className="tabular-nums text-xs text-text-tertiary">
                      {format(new Date(c.consentedAt), 'yyyy年M月d日')}
                      {c.consentTextVersion ? ` · v${c.consentTextVersion}` : ''}
                    </p>
                    {c.withdrawalReason ? (
                      <p className="text-xs text-text-secondary">撤回理由: {c.withdrawalReason}</p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case '対応履歴':
        return (
          <div className="space-y-4">
            {/* Timeline */}
            {activities.length === 0 ? (
              <p className="py-4 text-sm text-text-tertiary">対応履歴はありません</p>
            ) : (
              <ol className="space-y-0">
                {activities.map((a, i) => (
                  <li key={a.id} className="relative flex gap-3 pb-4">
                    {/* Connector line */}
                    {i < activities.length - 1 ? (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                    ) : null}
                    {/* Dot */}
                    <div className="relative mt-1 size-3.5 shrink-0 rounded-full border-2 border-brand-primary bg-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}
                        </span>
                        <span className="tabular-nums text-xs text-text-tertiary">
                          {a.createdAt ? format(new Date(a.createdAt), 'yyyy年M月d日') : '—'}
                        </span>
                      </div>
                      {a.content ? (
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-secondary">
                          {a.content}
                        </p>
                      ) : null}
                      {a.nextActionDate ? (
                        <p className="mt-1 tabular-nums text-xs text-brand-primary">
                          次回アクション: {a.nextActionDate}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {/* Add activity form */}
            <ActivityForm customerId={customer.id} />
          </div>
        );

      case 'ファイル':
        return <FileTab fileItems={customerFiles} />;

      case '監査':
        return <AuditTab entries={auditLogEntries} />;

      default:
        return null;
    }
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        breadcrumbs={[
          { label: '顧客', href: '/customers' },
          { label: customer.name },
        ]}
        action={
          <span className="tabular-nums text-xs text-text-tertiary">{customer.displayId}</span>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
        {/* Left 2/3: tabs */}
        <div className="min-w-0 flex-[2] lg:border-r lg:border-border">
          <DetailTabs
            panels={DETAIL_TAB_KEYS.map((tab) => ({
              tab,
              content: renderTabContent(tab),
            }))}
          />
        </div>

        {/* Right 1/3: sticky info panel */}
        <aside className="w-full shrink-0 border-t border-border lg:w-72 lg:border-t-0 xl:w-80">
          <div className="space-y-4 p-4 lg:sticky lg:top-0 lg:overflow-y-auto">
            {/* Staff */}
            <Card className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                担当情報
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">担当者</dt>
                  <dd className="font-medium text-text-primary">{staff?.displayName ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">催事会場</dt>
                  <dd className="text-text-primary">{event?.venueName ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">催事日</dt>
                  <dd className="tabular-nums text-text-primary">{event?.eventDate ?? '—'}</dd>
                </div>
              </dl>
            </Card>

            {/* Dates */}
            <Card className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                日付
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">登録日</dt>
                  <dd className="tabular-nums text-text-primary">
                    {customer.createdAt
                      ? format(new Date(customer.createdAt), 'yyyy年M月d日')
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">最終更新</dt>
                  <dd className="tabular-nums text-text-primary">
                    {customer.updatedAt
                      ? format(new Date(customer.updatedAt), 'yyyy年M月d日')
                      : '—'}
                  </dd>
                </div>
                {nextActionDate ? (
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">次回アクション</dt>
                    <dd className="tabular-nums font-medium text-brand-primary">{nextActionDate}</dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            {/* Consent / pin status */}
            <Card className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                ステータス
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">太陽光同意</span>
                  {hasSolarConsent ? (
                    <Badge tone="success">取得済み</Badge>
                  ) : (
                    <Badge tone="error">未取得</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">ピン確認</span>
                  {address?.pinConfirmed ? (
                    <Badge tone="success">確認済み</Badge>
                  ) : (
                    <Badge tone="neutral">未確認</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Address summary */}
            {address ? (
              <Card className="p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  住所
                </h3>
                {address.postalCode ? (
                  <p className="tabular-nums text-xs text-text-secondary">〒{address.postalCode}</p>
                ) : null}
                <p className="text-sm text-text-primary">
                  {[address.prefecture, address.city].filter(Boolean).join(' ')}
                </p>
              </Card>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
