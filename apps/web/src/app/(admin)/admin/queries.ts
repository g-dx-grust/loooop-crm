import { db, auditLogs, users, events, consentTextVersions, eq, isNull, desc, asc } from '@looop/db';

export interface AuditFilters {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface AuditLogRow {
  id: number;
  actorName: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string | null;
  diff: unknown;
}

export interface EventRow {
  id: string;
  eventName: string;
  venueName: string | null;
  venueAddress: string | null;
  eventDate: string | null;
  area: string | null;
  staffId: string | null;
  staffName: string | null;
  status: string;
  cost: number | null;
  memo: string | null;
}

export interface StaffOption {
  id: string;
  displayName: string;
}

export interface ConsentVersionRow {
  id: string;
  version: string;
  consentType: string;
  body: string;
  effectiveFrom: string | null;
  createdAt: string | null;
}

const PAGE_SIZE = 100;

export async function getAuditLogs(filters: AuditFilters): Promise<{ rows: AuditLogRow[]; total: number }> {
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  const allRows = await db
    .select({
      id: auditLogs.id,
      actorName: users.displayName,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      diff: auditLogs.diff,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt));

  // Filter in JS (SQLite doesn't support full text well)
  const filtered = allRows.filter((row) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchAction = row.action.toLowerCase().includes(q);
      const matchResource = (row.resourceType ?? '').toLowerCase().includes(q);
      if (!matchAction && !matchResource) return false;
    }
    if (filters.from) {
      const rowDate = row.createdAt ? row.createdAt.toISOString().slice(0, 10) : '';
      if (rowDate < filters.from) return false;
    }
    if (filters.to) {
      const rowDate = row.createdAt ? row.createdAt.toISOString().slice(0, 10) : '';
      if (rowDate > filters.to) return false;
    }
    return true;
  });

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + PAGE_SIZE);

  return {
    rows: paged.map((r) => ({
      id: typeof r.id === 'bigint' ? Number(r.id) : (r.id as number),
      actorName: r.actorName ?? null,
      action: r.action,
      resourceType: r.resourceType ?? null,
      resourceId: r.resourceId ?? null,
      ipAddress: r.ipAddress ?? null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      diff: r.diff ?? null,
    })),
    total,
  };
}

export async function getEvents(): Promise<EventRow[]> {
  const rows = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      venueName: events.venueName,
      venueAddress: events.venueAddress,
      eventDate: events.eventDate,
      area: events.area,
      staffId: events.staffId,
      staffName: users.displayName,
      status: events.status,
      cost: events.cost,
      memo: events.memo,
      createdAt: events.createdAt,
    })
    .from(events)
    .leftJoin(users, eq(users.id, events.staffId))
    .where(isNull(events.deletedAt))
    .orderBy(desc(events.createdAt));

  return rows.map((r) => ({
    id: r.id,
    eventName: r.eventName,
    venueName: r.venueName ?? null,
    venueAddress: r.venueAddress ?? null,
    eventDate: r.eventDate ?? null,
    area: r.area ?? null,
    staffId: r.staffId ?? null,
    staffName: r.staffName ?? null,
    status: r.status ?? 'active',
    cost: r.cost ?? null,
    memo: r.memo ?? null,
  }));
}

export async function getStaffOptions(): Promise<StaffOption[]> {
  return db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.displayName));
}

export async function getConsentVersions(): Promise<ConsentVersionRow[]> {
  const rows = await db
    .select()
    .from(consentTextVersions)
    .orderBy(desc(consentTextVersions.effectiveFrom), desc(consentTextVersions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    consentType: row.consentType,
    body: row.body,
    effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  }));
}
