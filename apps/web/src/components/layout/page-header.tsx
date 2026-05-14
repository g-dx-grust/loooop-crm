import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  const hasBreadcrumbs = !!breadcrumbs && breadcrumbs.length > 0;
  const hasAction = !!action;
  // On mobile the page title already lives in the sticky top app bar.
  // If there's no breadcrumbs and no action, the PageHeader has nothing
  // additional to show on mobile — hide it to save vertical space.
  const hiddenOnMobile = !hasBreadcrumbs && !hasAction;

  return (
    <div
      className={[
        'border-b border-border bg-bg-base',
        hiddenOnMobile ? 'hidden lg:block' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="px-4 pb-3 pt-3 lg:px-6 lg:pt-4">
        {hasBreadcrumbs ? (
          <nav className="mb-1 text-xs text-text-tertiary">
            {breadcrumbs!.map((b, i) => (
              <span key={i}>
                {i > 0 ? <span className="mx-1.5">/</span> : null}
                {b.href ? <a href={b.href} className="hover:text-text-secondary">{b.label}</a> : b.label}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Title: hidden on mobile (already shown in top app bar), full size on desktop */}
          <h1 className="hidden text-display text-text-primary lg:block">{title}</h1>
          {hasAction ? (
            <div className="flex w-full shrink-0 items-center justify-end gap-2 lg:w-auto">
              {action}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
