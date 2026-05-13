import { date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';

export const crossSellOpportunities = pgTable(
  'cross_sell_opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productType: text('product_type').notNull(),
    interestRank: text('interest_rank'),
    status: text('status').notNull().default('not_proposed'),
    nextActionDate: date('next_action_date'),
    expectedRevenue: integer('expected_revenue'),
    actualRevenue: integer('actual_revenue'),
    grossProfit: integer('gross_profit'),
    memo: text('memo'),
    // AI scoring (Phase 3)
    aiScore: text('ai_score'),
    aiScoreReason: text('ai_score_reason'),
    aiScoredAt: timestamp('ai_scored_at', { withTimezone: true }),
    // Reminder tracking (Phase 2)
    lastReminderSentAt: timestamp('last_reminder_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('cross_sell_customer_product_uq').on(t.customerId, t.productType),
    index('cross_sell_status_idx').on(t.status),
  ],
);

export type CrossSellRow = typeof crossSellOpportunities.$inferSelect;
