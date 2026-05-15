'use server';

import { db, events, auditLogs, eq, isNull, and } from '@looop/db';
import { revalidatePath } from 'next/cache';

export interface EventFormInput {
  id?: string;
  eventName: string;
  venueName: string;
  venueAddress: string;
  condition: string;
  area: string;
  eventDate: string;
  sourceType: string;
  status: string;
  cost: string;
  memo: string;
}

function validateInput(input: EventFormInput): string | null {
  if (!input.eventName.trim()) return '催事名を入力してください。';
  if (!input.venueName.trim())  return '会場名を入力してください。';
  if (!input.sourceType) return '種別を選択してください。';
  if (!['event', 'telema'].includes(input.sourceType)) return '種別が不正です。';
  if (!['active', 'scheduled', 'cancelled'].includes(input.status)) return 'ステータスが不正です。';
  return null;
}

export async function upsertEvent(
  input: EventFormInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const err = validateInput(input);
    if (err) return { success: false, error: err };

    const cost = input.cost ? Number(input.cost.replace(/,/g, '')) : null;
    const now = new Date();

    if (input.id) {
      await db
        .update(events)
        .set({
          eventName:    input.eventName.trim(),
          venueName:    input.venueName.trim() || null,
          venueAddress: input.venueAddress.trim() || null,
          condition:    input.condition.trim() || null,
          area:         input.area.trim() || null,
          eventDate:    input.eventDate || null,
          sourceType:   input.sourceType,
          status:       input.status,
          cost:         cost ?? null,
          memo:         input.memo.trim() || null,
          updatedAt:    now,
        })
        .where(and(eq(events.id, input.id), isNull(events.deletedAt)));

      await db.insert(auditLogs).values({
        action: 'update_event', resourceType: 'event', resourceId: input.id, createdAt: now,
      });

      revalidatePath('/events');
      revalidatePath('/intake');
      return { success: true, id: input.id };
    }

    const result = await db
      .insert(events)
      .values({
        eventName:    input.eventName.trim(),
        venueName:    input.venueName.trim() || null,
        venueAddress: input.venueAddress.trim() || null,
        condition:    input.condition.trim() || null,
        area:         input.area.trim() || null,
        eventDate:    input.eventDate || null,
        sourceType:   input.sourceType,
        status:       input.status,
        cost:         cost ?? null,
        memo:         input.memo.trim() || null,
      })
      .returning({ id: events.id });

    const newId = result[0]?.id;
    await db.insert(auditLogs).values({
      action: 'create_event', resourceType: 'event', resourceId: newId ?? null, createdAt: now,
    });

    revalidatePath('/events');
    revalidatePath('/intake');
    return { success: true, id: newId };
  } catch (err) {
    console.error('upsertEvent error:', err);
    return { success: false, error: '保存に失敗しました。' };
  }
}

export async function deleteEvent(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    await db.update(events).set({ deletedAt: now }).where(eq(events.id, id));
    await db.insert(auditLogs).values({
      action: 'delete_event', resourceType: 'event', resourceId: id, createdAt: now,
    });
    revalidatePath('/events');
    revalidatePath('/intake');
    return { success: true };
  } catch (err) {
    console.error('deleteEvent error:', err);
    return { success: false, error: '削除に失敗しました。' };
  }
}

export async function getEventsForAdmin() {
  const rows = await db
    .select()
    .from(events)
    .where(isNull(events.deletedAt))
    .orderBy(events.sourceType, events.venueName, events.condition);
  return rows;
}
