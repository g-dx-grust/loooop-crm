// Client-safe constants — mirrors packages/db/src/schema/_enums.ts
// Do NOT import from @looop/db here (Node.js only)

export const LOOOP_STATUSES = [
  'not_proposed',
  'proposed',
  'interested',
  'applied',
  'under_review',
  'contracted',
  'opened',
  'cancelled',
  'excluded',
] as const;
export type LooopStatus = (typeof LOOOP_STATUSES)[number];

export const CROSS_SELL_STATUSES = [
  'not_proposed',
  'proposed',
  'interested',
  'callback',
  'applied',
  'won',
  'lost',
  'excluded',
] as const;
export type CrossSellStatus = (typeof CROSS_SELL_STATUSES)[number];

export const PRODUCT_TYPES = ['hikari', 'water', 'mobile', 'solar', 'battery'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const INTEREST_RANKS = ['A', 'B', 'C'] as const;
export type InterestRank = (typeof INTEREST_RANKS)[number];

export const ACTIVITY_TYPES = ['call', 'visit', 'email', 'memo', 'status_change'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
