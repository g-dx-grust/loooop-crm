import { customType, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { users } from './users';

const inet = customType<{ data: string }>({ dataType: () => 'inet' });

export const consentTextVersions = pgTable('consent_text_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: text('version').notNull().unique(),
  consentType: text('consent_type').notNull(),
  body: text('body').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    consentType: text('consent_type').notNull(),
    consentStatus: text('consent_status').notNull(),
    consentTextVersion: text('consent_text_version').notNull(),
    consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(),
    consentedBy: uuid('consented_by').references(() => users.id, { onDelete: 'set null' }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    withdrawalReason: text('withdrawal_reason'),
    memo: text('memo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('consents_customer_type_idx').on(t.customerId, t.consentType, t.consentedAt),
  ],
);

export type ConsentRow = typeof consents.$inferSelect;
