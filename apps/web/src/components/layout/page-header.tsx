import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-bg-base">
      <div className="px-6 pb-3 pt-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-1 text-xs text-text-tertiary">
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {i > 0 ? <span className="mx-1.5">/</span> : null}
                {b.href ? <a href={b.href} className="hover:text-text-secondary">{b.label}</a> : b.label}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-display text-text-primary">{title}</h1>
          {action}
        </div>
      </div>
    </div>
  );
}
