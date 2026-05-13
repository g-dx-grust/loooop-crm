'use server';

import { db, events, auditLogs, consentTextVersions, eq } from '@looop/db';
import { revalidatePath } from 'next/cache';

export interface CreateEventInput {
  eventName: string;
  venueName?: string;
  venueAddress?: string;
  eventDate?: string;
  area?: string;
  staffId?: string;
  status?: string;
  cost?: number;
  memo?: string;
}

export interface CreateConsentVersionInput {
  version: string;
  body: string;
}

const EVENT_STATUSES = new Set(['scheduled', 'active', 'closed', 'disabled']);

function normalizeEventInput(input: CreateEventInput) {
  return {
    eventName: input.eventName.trim(),
    venueName: input.venueName?.trim() || null,
    venueAddress: input.venueAddress?.trim() || null,
    eventDate: input.eventDate || null,
    area: input.area?.trim() || null,
    staffId: input.staffId || null,
    status: input.status && EVENT_STATUSES.has(input.status) ? input.status : 'active',
    cost: input.cost !== undefined && Number.isFinite(input.cost) ? input.cost : null,
    memo: input.memo?.trim() || null,
  };
}

export async function createEvent(
  input: CreateEventInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = normalizeEventInput(input);
    if (!normalized.eventName) {
      return { success: false, error: '催事名は必須です' };
    }

    const now = new Date();
    await db.insert(events).values({
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(auditLogs).values({
      action: 'create_event',
      resourceType: 'event',
      diff: { input: normalized },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('createEvent error:', err);
    return { success: false, error: '会場の作成に失敗しました' };
  }
}

export async function updateEvent(
  id: string,
  input: CreateEventInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = normalizeEventInput(input);
    if (!normalized.eventName) {
      return { success: false, error: '催事名は必須です' };
    }

    const now = new Date();
    await db
      .update(events)
      .set({
        ...normalized,
        updatedAt: now,
      })
      .where(eq(events.id, id));

    await db.insert(auditLogs).values({
      action: 'update_event',
      resourceType: 'event',
      resourceId: id,
      diff: { input: normalized },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('updateEvent error:', err);
    return { success: false, error: '会場の更新に失敗しました' };
  }
}

export async function createConsentVersion(
  input: CreateConsentVersionInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const version = input.version.trim();
    const body = input.body.trim();
    if (!version) return { success: false, error: 'バージョンを入力してください' };
    if (!body) return { success: false, error: '同意文を入力してください' };

    const now = new Date();
    await db.insert(consentTextVersions).values({
      version,
      consentType: 'combined_personal_solar',
      body,
      effectiveFrom: now,
      createdAt: now,
    });

    await db.insert(auditLogs).values({
      action: 'create_consent_text_version',
      resourceType: 'consent_text_version',
      diff: { version, consentType: 'combined_personal_solar' },
      createdAt: now,
    });

    revalidatePath('/admin');
    revalidatePath('/intake');
    return { success: true };
  } catch (err) {
    console.error('createConsentVersion error:', err);
    return { success: false, error: '同意文バージョンの作成に失敗しました' };
  }
}
