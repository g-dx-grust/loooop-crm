import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { users } from './users';

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    fileType: text('file_type').notNull(),
    blobUrl: text('blob_url').notNull(),
    blobPathname: text('blob_pathname'),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('files_customer_idx').on(t.customerId)],
);

export type FileRow = typeof files.$inferSelect;
