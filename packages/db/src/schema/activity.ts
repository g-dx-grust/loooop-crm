import { date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { users } from './users';

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id').references(() => users.id, { onDelete: 'set null' }),
    activityType: text('activity_type').notNull(),
    content: text('content'),
    nextActionDate: date('next_action_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activities_customer_idx').on(t.customerId, t.createdAt)],
);

export type ActivityRow = typeof activities.$inferSelect;
