// Client-safe constants — mirrors packages/db/src/schema/_enums.ts
// Do NOT import from @looop/db here (Node.js only)

export const LOOOP_STATUSES = [
  'applied',
  'cancelled',
  'matching_error',
  'terminated',
  'completed',
] as const;
export type LooopStatus = (typeof LOOOP_STATUSES)[number];

export const LOOOP_PLAN_CODES = ['smart_time_one_lighting'] as const;
export type LooopPlanCode = (typeof LOOOP_PLAN_CODES)[number];

export const LOOOP_PAYMENT_METHODS = ['bank_account', 'other'] as const;
export type LooopPaymentMethod = (typeof LOOOP_PAYMENT_METHODS)[number];

export const REFUND_REASONS = [
  'application_cancelled',
  'early_termination',
  'fraud',
  'forced_enrollment',
  'short_term_inducement',
  'rule_violation',
  'other',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/** 業務管理費（税別） — 仕様書 §5 */
export const ADMIN_FEE_DEFAULT = 2000;

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
