'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users, Zap, ShoppingBag, Sun, BarChart3, Settings,
  ClipboardList, ChevronLeft, ChevronRight,
  Receipt, TrendingUp, Undo2, Calculator, CalendarDays,
  Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { logoutAction } from '@/app/login/logout-action';

const STORAGE_KEY = 'looop_crm.sidebar_collapsed';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: string;
};

type NavSection = {
  label?: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/intake', label: '新規登録フォーム', icon: ClipboardList, perm: 'nav.intake' },
    ],
  },
  {
    label: '顧客・申込',
    items: [
      { href: '/customers',     label: '顧客',       icon: Users,   perm: 'nav.customers' },
      { href: '/looop',         label: 'Looop申込',  icon: Zap,     perm: 'nav.looop' },
      { href: '/bills',         label: '明細',       icon: Receipt, perm: 'nav.bills' },
      { href: '/refunds',       label: '返還対象',   icon: Undo2,   perm: 'nav.refunds' },
    ],
  },
  {
    label: 'クロスセル',
    items: [
      { href: '/cross-sell',    label: 'クロスセル', icon: ShoppingBag, perm: 'nav.cross_sell' },
      { href: '/solar-handoff', label: '太陽光連携', icon: Sun,         perm: 'nav.solar_handoff' },
    ],
  },
  {
    label: 'レポート・設定',
    items: [
      { href: '/sales',       label: '売上集計',         icon: TrendingUp,  perm: 'nav.sales' },
      { href: '/kpi',         label: 'KPI',              icon: BarChart3,   perm: 'nav.kpi' },
      { href: '/fee-master',  label: '手数料マスター',   icon: Calculator,  perm: 'nav.fee_master' },
      { href: '/events',      label: '催事・テレマ管理', icon: CalendarDays, perm: 'nav.events' },
      { href: '/admin',       label: '管理',             icon: Settings,    perm: 'nav.admin' },
    ],
  },
];

function filterSections(allowed: Set<string>): NavSection[] {
  return NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => allowed.has(i.perm)) }))
    .filter((s) => s.items.length > 0);
}

function findActiveLabel(pathname: string, sections: NavSection[]): string | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item.label;
      }
    }
  }
  return null;
}

interface NavListProps {
  pathname: string;
  isCollapsed: boolean;
  sections: NavSection[];
  onNavigate?: () => void;
}

function NavList({ pathname, isCollapsed, sections, onNavigate }: NavListProps) {
  return (
    <ul>
      {sections.map((section, sIdx) => (
        <li key={sIdx}>
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
                    onClick={onNavigate}
                    className={cn(
                      'group relative flex w-full items-center rounded transition-colors',
                      isCollapsed ? 'h-8 justify-center px-0 text-[13px]' : 'h-11 gap-2.5 px-2.5 text-sm lg:h-8 lg:text-[13px]',
                      active
                        ? [
                            'bg-brand-primarySoft font-medium text-brand-primary',
                            'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                            'before:h-5 before:w-0.5 before:rounded-r before:bg-brand-primary',
                          ]
                        : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
                    )}
                  >
                    <Icon
                      className={cn(
                        'shrink-0',
                        isCollapsed ? 'size-[18px]' : 'size-[18px] lg:size-4',
                        active ? 'text-brand-primary' : '',
                      )}
                      aria-hidden
                    />

                    {!isCollapsed && (
                      <span className="truncate leading-none">{label}</span>
                    )}

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
  );
}

interface UserBlockProps {
  displayName: string;
  roleLabel: string;
  email: string;
  isCollapsed: boolean;
}

function UserBlock({ displayName, roleLabel, email, isCollapsed }: UserBlockProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initial = displayName.slice(0, 1);

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      router.replace('/login');
      router.refresh();
    });
  }

  if (isCollapsed) {
    return (
      <div className="border-t border-border p-2">
        <button
          onClick={handleLogout}
          disabled={pending}
          className="group relative flex size-9 w-full items-center justify-center rounded text-text-secondary hover:bg-bg-subtle hover:text-text-primary disabled:opacity-50"
          aria-label="ログアウト"
        >
          <LogOut className="size-4" aria-hidden />
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded border border-border bg-white px-2 py-1 text-xs text-text-primary opacity-0 shadow-overlay transition-opacity group-hover:opacity-100"
          >
            ログアウト ({displayName})
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border p-2.5">
      <div className="flex items-center gap-2">
        <div
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primarySoft text-[12px] font-semibold text-brand-primary"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-text-primary">
            {displayName}
          </p>
          <p className="truncate text-[11px] leading-tight text-text-tertiary">
            {roleLabel}
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={pending}
          className="flex size-7 shrink-0 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text-secondary disabled:opacity-50"
          aria-label="ログアウト"
          title={`ログアウト (${email})`}
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

interface SidebarProps {
  allowedPerms: string[];
  displayName: string;
  roleLabel: string;
  email: string;
}

export function Sidebar({ allowedPerms, displayName, roleLabel, email }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allowed = new Set(allowedPerms);
  const sections = filterSections(allowed);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true);
    } catch {
      // localStorage unavailable (e.g. iframe sandbox)
    }
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  const isCollapsed = mounted && collapsed;
  const activeLabel = findActiveLabel(pathname, sections) ?? 'Looop CRM';

  return (
    <>
      {/* ── Mobile / Tablet top app bar (< lg) ───────────────── */}
      <header
        className={cn(
          'sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-base px-3',
          'lg:hidden',
        )}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex size-10 items-center justify-center rounded text-text-secondary transition-colors hover:bg-bg-subtle"
          aria-label="メニューを開く"
        >
          <Menu className="size-5" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-text-primary">
          {activeLabel}
        </span>
        <span className="size-10" aria-hidden />
      </header>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal
          aria-label="メインメニュー"
        >
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-bg-base shadow-overlay">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="select-none truncate text-sm font-semibold leading-none tracking-tight text-text-primary">
                Looop CRM
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded text-text-disabled transition-colors hover:bg-bg-subtle hover:text-text-secondary"
                aria-label="メニューを閉じる"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2" aria-label="メインメニュー">
              <NavList
                pathname={pathname}
                isCollapsed={false}
                sections={sections}
                onNavigate={() => setDrawerOpen(false)}
              />
            </nav>
            <UserBlock
              displayName={displayName}
              roleLabel={roleLabel}
              email={email}
              isCollapsed={false}
            />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar (≥ lg) ───────────────────────────── */}
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col border-r border-border bg-bg-base lg:flex',
          'transition-[width] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed ? 'w-14' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-12 shrink-0 items-center border-b border-border',
            isCollapsed ? 'justify-center' : 'justify-between px-4',
          )}
        >
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
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

        <nav className="flex-1 overflow-y-auto py-2" aria-label="メインメニュー">
          <NavList pathname={pathname} isCollapsed={isCollapsed} sections={sections} />
        </nav>

        <UserBlock
          displayName={displayName}
          roleLabel={roleLabel}
          email={email}
          isCollapsed={isCollapsed}
        />
      </aside>
    </>
  );
}
