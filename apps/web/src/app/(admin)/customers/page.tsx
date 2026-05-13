import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CustomerFilters } from './customer-filters';
import { CustomerTableClient } from './customer-table-client';
import { getCustomers, getEvents, getStaff, type CustomerSortField, type SortOrder } from './queries';

interface SearchParams {
  search?: string;
  eventId?: string;
  staffId?: string;
  looopStatus?: string;
  pinConfirmed?: string;
  hasConsent?: string;
  includeCancelled?: string;
  page?: string;
  sort?: string;
  order?: string;
}

function buildPageUrl(params: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();
  const keys: (keyof SearchParams)[] = [
    'search', 'eventId', 'staffId', 'looopStatus',
    'pinConfirmed', 'hasConsent', 'includeCancelled', 'page', 'sort', 'order',
  ];
  for (const k of keys) {
    const v = merged[k];
    if (v) sp.set(k, v);
  }
  return `/customers?${sp.toString()}`;
}

function SortTh({
  label,
  field,
  currentSort,
  currentOrder,
  params,
  className,
}: {
  label: string;
  field: CustomerSortField;
  currentSort: CustomerSortField | null;
  currentOrder: SortOrder;
  params: SearchParams;
  className?: string;
}) {
  const isActive = currentSort === field;
  const nextOrder: SortOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';
  const href = buildPageUrl(params, { sort: field, order: nextOrder, page: '1' });

  return (
    <th className={`h-9 px-3 text-left text-xs font-semibold text-text-secondary ${className ?? ''}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
        aria-label={`${label}で${nextOrder === 'asc' ? '昇順' : '降順'}ソート`}
      >
        {label}
        {isActive ? (
          currentOrder === 'asc'
            ? <ChevronUp className="size-3 text-brand-primary" aria-hidden />
            : <ChevronDown className="size-3 text-brand-primary" aria-hidden />
        ) : (
          <ChevronsUpDown className="size-3 text-text-disabled" aria-hidden />
        )}
      </Link>
    </th>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const sortField = (['displayId', 'name', 'eventDate', 'updatedAt'] as CustomerSortField[]).includes(
    params.sort as CustomerSortField,
  )
    ? (params.sort as CustomerSortField)
    : null;
  const sortOrder: SortOrder = params.order === 'asc' ? 'asc' : 'desc';

  const filters = {
    search: params.search,
    eventId: params.eventId,
    staffId: params.staffId,
    looopStatus: params.looopStatus,
    pinConfirmed: params.pinConfirmed === '1' ? true : undefined,
    hasConsent: params.hasConsent === '1' ? true : undefined,
    includeCancelled: params.includeCancelled === '1',
    page: params.page ? Number(params.page) : 1,
    sort: sortField ?? undefined,
    order: sortOrder,
  };

  const [{ items, total, page, pageSize }, events, staff] = await Promise.all([
    getCustomers(filters),
    getEvents(),
    getStaff(),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters = !!(
    params.search || params.eventId || params.staffId ||
    params.looopStatus || params.pinConfirmed || params.hasConsent || params.includeCancelled
  );

  return (
    <>
      <PageHeader
        title="顧客"
        action={
          <Link href="/intake">
            <Button>
              <Plus className="size-4" />
              新規登録
            </Button>
          </Link>
        }
      />

      <Suspense>
        <CustomerFilters events={events} staff={staff} />
      </Suspense>

      <div className="p-6">
        {/* Result count */}
        <div className="mb-3">
          <p className="text-xs text-text-tertiary tabular-nums">
            {total.toLocaleString('ja-JP')}件
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                {/* checkbox placeholder — managed by client component */}
                <th className="h-9 w-10 px-3" aria-hidden />
                <SortTh label="ID"     field="displayId" currentSort={sortField} currentOrder={sortOrder} params={params} />
                <SortTh label="お客様名" field="name"      currentSort={sortField} currentOrder={sortOrder} params={params} />
                <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">電話番号</th>
                <SortTh label="催事日 / 会場" field="eventDate" currentSort={sortField} currentOrder={sortOrder} params={params} />
                <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">担当者</th>
                <th className="h-9 px-3 text-left text-xs font-semibold text-text-secondary">Looopステータス</th>
                <th className="h-9 px-3 text-center text-xs font-semibold text-text-secondary">同意</th>
                <th className="h-9 px-3 text-center text-xs font-semibold text-text-secondary">ピン</th>
                <SortTh label="最終更新" field="updatedAt" currentSort={sortField} currentOrder={sortOrder} params={params} />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="size-8 text-text-disabled" aria-hidden />
                      <p className="text-sm text-text-secondary">条件に一致する顧客が見つかりません</p>
                      {hasActiveFilters ? (
                        <Link href="/customers">
                          <Button variant="secondary" size="sm">フィルタをリセット</Button>
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                <CustomerTableClient items={items} />
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-text-tertiary tabular-nums">
              {page} / {totalPages} ページ（{total.toLocaleString('ja-JP')}件）
            </p>
            <div className="flex items-center gap-1">
              {page > 1 ? (
                <Link href={buildPageUrl(params, { page: String(page - 1) })}>
                  <Button variant="secondary" size="sm">
                    <ChevronLeft className="size-4" />
                    前へ
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  <ChevronLeft className="size-4" />
                  前へ
                </Button>
              )}

              <span className="min-w-[4rem] text-center text-xs text-text-secondary tabular-nums">
                {page} / {totalPages}
              </span>

              {page < totalPages ? (
                <Link href={buildPageUrl(params, { page: String(page + 1) })}>
                  <Button variant="secondary" size="sm">
                    次へ
                    <ChevronRight className="size-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" size="sm" disabled>
                  次へ
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
