import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { events } from './events';
import { users } from './users';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    staffId: uuid('staff_id').references(() => users.id, { onDelete: 'set null' }),
    leadStatus: text('lead_status').notNull().default('new'),
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('leads_event_staff_idx').on(t.eventId, t.staffId, t.createdAt),
    index('leads_customer_idx').on(t.customerId),
  ],
);

export type LeadRow = typeof leads.$inferSelect;
