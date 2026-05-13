import { date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
  cost: integer('cost'),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type EventRow = typeof events.$inferSelect;
