import React from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-bg-muted ${className ?? ''}`}
      style={style}
      aria-hidden
    />
  );
}

export default function CustomersLoading() {
  return (
    <>
      <PageHeader
        title="顧客"
        action={
          <Button disabled>
            <Plus className="size-4" />
            新規登録
          </Button>
        }
      />

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-base px-6 py-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>

      <div className="p-6">
        <Skeleton className="mb-3 h-4 w-12" />

        <div className="overflow-hidden rounded-lg border border-border bg-white">
          {/* Header */}
          <div className="flex h-9 items-center gap-4 border-b border-border bg-bg-subtle px-3">
            {[10, 80, 120, 100, 160, 80, 100, 40, 40, 60].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: 12 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex h-10 items-center gap-4 border-b border-border px-3 last:border-0"
            >
              {[10, 80, 120, 100, 160, 80, 72, 16, 16, 40].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-3"
                  style={{
                    width: w,
                    opacity: 1 - rowIdx * 0.06,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
