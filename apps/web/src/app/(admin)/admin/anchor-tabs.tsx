'use client';

const TABS = [
  { anchor: 'audit', label: '監査ログ' },
  { anchor: 'events', label: '会場マスタ' },
  { anchor: 'consent-texts', label: '同意文' },
] as const;

export function AnchorTabs() {
  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <a
          key={tab.anchor}
          href={`#${tab.anchor}`}
          className="h-9 px-3 flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
