'use client';

interface AnchorTabsProps {
  canManageUsers: boolean;
  canManageEvents: boolean;
}

export function AnchorTabs({ canManageUsers, canManageEvents }: AnchorTabsProps) {
  const tabs = [
    canManageUsers ? { anchor: 'users', label: 'ユーザー・権限' } : null,
    { anchor: 'audit', label: '監査ログ' },
    canManageEvents ? { anchor: 'events', label: '会場マスタ' } : null,
    { anchor: 'consent-texts', label: '同意文' },
  ].filter(Boolean) as { anchor: string; label: string }[];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <a
          key={tab.anchor}
          href={`#${tab.anchor}`}
          className="flex h-9 shrink-0 items-center whitespace-nowrap px-3 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
