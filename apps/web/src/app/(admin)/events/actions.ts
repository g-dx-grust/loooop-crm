'use server';

import { db, events, leads, eventCostItems, eventCostSplits, auditLogs, eq, isNull, and, sql } from '@looop/db';
import { revalidatePath } from 'next/cache';
import type { EventRow } from '@looop/db';

export type EventWithCount = EventRow & { acquisitionCount: number };

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

export async function getEventsForAdmin(): Promise<EventWithCount[]> {
  const rows = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      venueName: events.venueName,
      venueAddress: events.venueAddress,
      eventDate: events.eventDate,
      area: events.area,
      staffId: events.staffId,
      status: events.status,
      sourceType: events.sourceType,
      condition: events.condition,
      cost: events.cost,
      memo: events.memo,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      deletedAt: events.deletedAt,
      acquisitionCount: sql<number>`count(${leads.id})::int`,
    })
    .from(events)
    .leftJoin(leads, eq(leads.eventId, events.id))
    .where(isNull(events.deletedAt))
    .groupBy(events.id)
    .orderBy(events.sourceType, events.venueName, events.condition);
  return rows;
}

// ---------------------------------------------------------------------------
// Event cost items
// ---------------------------------------------------------------------------

export interface CostItemInput {
  id?: string;
  eventId: string;
  description: string;
  totalCost: number;
  markupRate: number;
  billingDate?: string;
  note?: string;
}

export type CostItemWithAmounts = {
  id: string;
  eventId: string;
  description: string;
  totalCost: number;
  markupRate: number;
  billingDate: string | null;
  note: string | null;
  createdAt: Date;
  markupAmount: number;
  totalBilled: number;
};

export async function getEventCostItems(eventId: string): Promise<CostItemWithAmounts[]> {
  const rows = await db
    .select()
    .from(eventCostItems)
    .where(and(eq(eventCostItems.eventId, eventId), isNull(eventCostItems.deletedAt)))
    .orderBy(eventCostItems.createdAt);

  return rows.map((r) => {
    const markup = Math.floor(r.totalCost * r.markupRate / 100);
    return { ...r, markupAmount: markup, totalBilled: r.totalCost + markup };
  });
}

export async function upsertEventCostItem(
  input: CostItemInput,
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const markup = Math.floor(input.totalCost * input.markupRate / 100);
    const totalBilled = input.totalCost + markup;
    const now = new Date();

    if (input.id) {
      await db
        .update(eventCostItems)
        .set({
          description: input.description,
          totalCost: input.totalCost,
          markupRate: input.markupRate,
          billingDate: input.billingDate || null,
          note: input.note || null,
          updatedAt: now,
        })
        .where(eq(eventCostItems.id, input.id));

      await db
        .update(eventCostSplits)
        .set({ baseAmount: input.totalCost, markupAmount: markup, totalBilled, updatedAt: now })
        .where(eq(eventCostSplits.costItemId, input.id));

      revalidatePath('/events');
      return { success: true, id: input.id };
    }

    const result = await db
      .insert(eventCostItems)
      .values({
        eventId: input.eventId,
        description: input.description,
        totalCost: input.totalCost,
        markupRate: input.markupRate,
        billingDate: input.billingDate || null,
        note: input.note || null,
      })
      .returning({ id: eventCostItems.id });

    const newId = result[0]?.id;
    if (!newId) return { success: false, error: '登録に失敗しました。' };

    await db.insert(eventCostSplits).values({
      costItemId: newId,
      recipientName: '未定',
      baseAmount: input.totalCost,
      markupAmount: markup,
      totalBilled,
    });

    revalidatePath('/events');
    return { success: true, id: newId };
  } catch (err) {
    console.error('upsertEventCostItem error:', err);
    return { success: false, error: '保存に失敗しました。' };
  }
}

export async function deleteEventCostItem(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(eventCostItems).set({ deletedAt: new Date() }).where(eq(eventCostItems.id, id));
    revalidatePath('/events');
    return { success: true };
  } catch (err) {
    console.error('deleteEventCostItem error:', err);
    return { success: false, error: '削除に失敗しました。' };
  }
}
