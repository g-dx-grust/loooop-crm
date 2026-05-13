import { bigserial, customType, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { partnerCompanies } from './partner';
import { users } from './users';

const inet = customType<{ data: string }>({ dataType: () => 'inet' });

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    diff: jsonb('diff'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_actor_created_idx').on(t.actorUserId, t.createdAt),
    index('audit_resource_idx').on(t.resourceType, t.resourceId),
    index('audit_action_idx').on(t.action),
  ],
);

export const csvExports = pgTable('csv_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  exporterUserId: uuid('exporter_user_id').references(() => users.id, { onDelete: 'set null' }),
  exportedAt: timestamp('exported_at', { withTimezone: true }).notNull().defaultNow(),
  targetPartnerId: uuid('target_partner_id').references(() => partnerCompanies.id, { onDelete: 'set null' }),
  recordCount: integer('record_count').notNull(),
  customerIds: jsonb('customer_ids').$type<string[]>().notNull(),
  filterSnapshot: jsonb('filter_snapshot'),
  fileBlobUrl: text('file_blob_url'),
  reason: text('reason'),
});

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type CsvExportRow = typeof csvExports.$inferSelect;
