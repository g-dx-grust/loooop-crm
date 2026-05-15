import { date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  venueName: text('venue_name'),
  venueAddress: text('venue_address'),
  eventDate: date('event_date'),
  area: text('area'),
  staffId: uuid('staff_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'),
  /** 'event' = 催事 / 'telema' = テレマ。テレマは季節指数計算対象外 */
  sourceType: text('source_type').notNull().default('event'),
  /** 催事条件 e.g. '平日', '土日', 'GW' */
  condition: text('condition'),
  cost: integer('cost'),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type EventRow = typeof events.$inferSelect;

/**
 * 催事費用明細。催事ごとにかかった費用（ブース代・人件費など）を記録する。
 * 按分計算は event_cost_splits に持つ。
 */
export const eventCostItems = pgTable(
  'event_cost_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    /** 費用合計（円） */
    totalCost: integer('total_cost').notNull().default(0),
    /** 手間賃率 % (デフォルト 10) */
    markupRate: integer('markup_rate').notNull().default(10),
    billingDate: date('billing_date'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('event_cost_items_event_idx').on(t.eventId)],
);

export type EventCostItemRow = typeof eventCostItems.$inferSelect;

/**
 * 費用按分明細。誰にいくら請求するか、手間賃込みの利益を管理する。
 * recipient_name は現時点では自由入力（partner_companies と後から紐付け可）。
 */
export const eventCostSplits = pgTable(
  'event_cost_splits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    costItemId: uuid('cost_item_id').notNull().references(() => eventCostItems.id, { onDelete: 'cascade' }),
    /** 按分先名称（パートナー名・チーム名など） */
    recipientName: text('recipient_name').notNull(),
    /** 按分元コスト（円） */
    baseAmount: integer('base_amount').notNull().default(0),
    /** 手間賃額 = base_amount × markup_rate / 100（円） */
    markupAmount: integer('markup_amount').notNull().default(0),
    /** 請求合計 = base_amount + markup_amount（円） */
    totalBilled: integer('total_billed').notNull().default(0),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('event_cost_splits_cost_item_idx').on(t.costItemId)],
);

export type EventCostSplitRow = typeof eventCostSplits.$inferSelect;
