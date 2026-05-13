'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, Zap, ShoppingBag, Sun, BarChart3, Settings,
  ClipboardList, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'looop_crm.sidebar_collapsed';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/intake', label: '催事フォーム', icon: ClipboardList },
    ],
  },
  {
    label: '顧客管理',
    items: [
      { href: '/customers',     label: '顧客',       icon: Users },
      { href: '/looop',         label: 'Looop申込',  icon: Zap },
      { href: '/cross-sell',    label: 'クロスセル', icon: ShoppingBag },
      { href: '/solar-handoff', label: '太陽光連携', icon: Sun },
    ],
  },
  {
    label: 'レポート・設定',
    items: [
      { href: '/kpi',   label: 'KPI', icon: BarChart3 },
      { href: '/admin', label: '管理', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true);
    } catch {
      // localStorage unavailable (e.g. iframe sandbox)
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const isCollapsed = mounted && collapsed;

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-bg-base',
        'transition-[width] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isCollapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex h-12 shrink-0 items-center border-b border-border',
          isCollapsed ? 'justify-center' : 'justify-between px-4',
        )}
      >
        {!isCollapsed && (
          <div className="flex min-w-0 items-center gap-2">
            {/* Wordmark */}
            <span className="select-none truncate text-sm font-semibold leading-none tracking-tight text-text-primary">
              Looop CRM
            </span>
          </div>
        )}

        <button
          onClick={toggle}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded',
            'text-text-disabled transition-colors hover:bg-bg-subtle hover:text-text-secondary',
          )}
          aria-label={isCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          {isCollapsed
            ? <ChevronRight className="size-[15px]" />
            : <ChevronLeft  className="size-[15px]" />}
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="メインメニュー">
        <ul>
          {NAV_SECTIONS.map((section, sIdx) => (
            <li key={sIdx}>
              {/* Section label */}
              {section.label && !isCollapsed ? (
                <p className="mb-0.5 mt-3 px-3.5 text-[11px] font-medium leading-none tracking-wide text-text-disabled first:mt-1">
                  {section.label}
                </p>
              ) : sIdx > 0 ? (
                <div className="mx-2 my-1.5 border-t border-border" aria-hidden />
              ) : null}

              <ul className="space-y-0.5 px-2">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'group relative flex h-8 w-full items-center rounded text-[13px] transition-colors',
                          isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                          active
                            ? [
                                'bg-brand-primarySoft font-medium text-brand-primary',
                                'before:absolute before:left-0 before:top-1.5',
                                'before:h-5 before:w-0.5 before:rounded-r before:bg-brand-primary',
                              ]
                            : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
                        )}
                      >
                        <Icon
                          className={cn(
                            'shrink-0 transition-none',
                            isCollapsed ? 'size-[18px]' : 'size-4',
                            active ? 'text-brand-primary' : '',
                          )}
                          aria-hidden
                        />

                        {/* Expanded label */}
                        {!isCollapsed && (
                          <span className="truncate leading-none">{label}</span>
                        )}

                        {/* Collapsed tooltip */}
                        {isCollapsed && (
                          <span
                            role="tooltip"
                            className={cn(
                              'pointer-events-none absolute left-full z-50 ml-2',
                              'whitespace-nowrap rounded border border-border bg-white',
                              'px-2 py-1 text-xs font-normal text-text-primary shadow-overlay',
                              'opacity-0 transition-opacity group-hover:opacity-100',
                            )}
                          >
                            {label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
