// 文字列ベースの enum (PostgreSQL の enum 型を使うとマイグレが面倒なので text + check 制約で運用)

export const ROLE_CODES = ['admin', 'field'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const USER_STATUSES = ['active', 'suspended', 'left'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ACCURACY_STATUSES = [
  'unconfirmed',
  'google_auto',
  'customer_verified',
  'manually_corrected',
] as const;

export const RESIDENCE_TYPES = ['detached', 'apartment', 'store', 'other', 'unknown'] as const;
export const OWNERSHIP_TYPES = ['owned', 'rented', 'family', 'unknown'] as const;

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'disqualified'] as const;

export const LOOOP_STATUSES = [
  'applied',
  'cancelled',
  'matching_error',
  'terminated',
  'completed',
] as const;

export const PAYMENT_STATUSES = ['unbilled', 'billed', 'paid'] as const;

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

export const PRODUCT_TYPES = ['hikari', 'water', 'mobile', 'solar', 'battery'] as const;
export const INTEREST_RANKS = ['A', 'B', 'C'] as const;
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

export const CONSENT_TYPES = ['personal_info_use', 'solar_partner_share'] as const;
export const CONSENT_STATUSES = ['granted', 'withdrawn'] as const;

export const HANDOFF_STATUSES = [
  'not_proposed',
  'interested',
  'consent_obtained',
  'pending',
  'handed_off',
  'partner_called',
  'appointment',
  'negotiating',
  'won',
  'lost',
  'excluded',
  'consent_withdrawn',
] as const;

export const ACTIVITY_TYPES = ['call', 'visit', 'email', 'memo', 'status_change'] as const;
export const FILE_TYPES = ['electric_bill', 'consent_signature', 'photo', 'other'] as const;
