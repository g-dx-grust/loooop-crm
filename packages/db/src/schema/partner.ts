import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { users } from './users';

export const partnerCompanies = pgTable('partner_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  productType: text('product_type').notNull(),
  contactEmail: text('contact_email'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const partnerHandoffs = pgTable(
  'partner_handoffs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    partnerCompanyId: uuid('partner_company_id').references(() => partnerCompanies.id, { onDelete: 'set null' }),
    productType: text('product_type').notNull(),
    sharedItems: jsonb('shared_items').$type<string[]>().notNull(),
    sharedAt: timestamp('shared_at', { withTimezone: true }).notNull(),
    sharedBy: uuid('shared_by').references(() => users.id, { onDelete: 'set null' }),
    handoffStatus: text('handoff_status').notNull().default('handed_off'),
    csvExportId: uuid('csv_export_id'),
    partnerResult: text('partner_result'),
    memo: text('memo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('handoffs_customer_idx').on(t.customerId),
    index('handoffs_status_idx').on(t.handoffStatus),
  ],
);

export type PartnerCompanyRow = typeof partnerCompanies.$inferSelect;
export type PartnerHandoffRow = typeof partnerHandoffs.$inferSelect;
