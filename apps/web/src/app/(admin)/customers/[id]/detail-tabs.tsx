'use client';

// Client component: manages active tab state

import { useState } from 'react';
import { cn } from '@/lib/cn';

export const TAB_KEYS = [
  '基本情報',
  '住所・地図',
  'Looop',
  'クロスセル',
  '太陽光連携',
  '同意履歴',
  '対応履歴',
  'ファイル',
  '監査',
] as const;

export type TabKey = (typeof TAB_KEYS)[number];

interface DetailTabsProps {
  panels: { tab: TabKey; content: React.ReactNode }[];
}

export function DetailTabs({ panels }: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('基本情報');
  const activePanel = panels.find((panel) => panel.tab === activeTab);

  return (
    <div className="flex min-h-0 flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-bg-base">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative h-10 px-4 text-sm transition-colors',
              activeTab === tab
                ? 'text-brand-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-primary'
                : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">{activePanel?.content}</div>
    </div>
  );
}
