import { NextRequest, NextResponse } from 'next/server';
import { db, crossSellOpportunities, customers, leads, users, eq, and, isNull, or, sql, lt } from '@looop/db';

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  hikari: 'Looop光',
  water: 'ウォーターサーバー',
  mobile: 'モバイル',
  solar: '太陽光発電',
  battery: '蓄電池',
};

export async function GET(request: NextRequest) {
  // CRON_SECRET が設定されている場合のみ Bearer トークンを検証
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 今日の日付文字列（YYYY-MM-DD）と今日の開始時刻（UTC 0時）
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let rows: {
    id: string;
    customerId: string;
    customerName: string;
    productType: string;
    nextActionDate: string | null;
    staffName: string | null;
  }[];

  try {
    rows = await db
      .select({
        id: crossSellOpportunities.id,
        customerId: crossSellOpportunities.customerId,
        customerName: customers.name,
        productType: crossSellOpportunities.productType,
        nextActionDate: crossSellOpportunities.nextActionDate,
        staffName: users.displayName,
      })
      .from(crossSellOpportunities)
      .innerJoin(customers, eq(crossSellOpportunities.customerId, customers.id))
      .leftJoin(leads, eq(customers.id, leads.customerId))
      .leftJoin(users, eq(leads.staffId, users.id))
      .where(
        and(
          isNull(crossSellOpportunities.deletedAt),
          lt(crossSellOpportunities.nextActionDate, todayStr),
          sql`${crossSellOpportunities.status} NOT IN ('won', 'lost', 'excluded')`,
          or(
            isNull(crossSellOpportunities.lastReminderSentAt),
            lt(crossSellOpportunities.lastReminderSentAt, todayStart),
          ),
        ),
      );
  } catch (err) {
    console.error('[cron/reminders] DB query failed:', err);
    return NextResponse.json({ error: 'DB query failed' }, { status: 500 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  const webhookUrl = process.env.LARK_WEBHOOK_URL;

  if (webhookUrl) {
    const itemsList = rows
      .map(
        (r) =>
          `**${r.customerName}** — ${PRODUCT_TYPE_LABELS[r.productType] ?? r.productType} (${r.nextActionDate} 超過)`,
      )
      .join('\n');

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `https://${process.env.VERCEL_URL ?? 'localhost:3000'}`;

    const payload = {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: 'plain_text', content: 'クロスセル期限アラート' },
          template: 'orange',
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `以下の顧客の次回アクション期日が超過しています。\n\n${itemsList}`,
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: 'クロスセル一覧を確認' },
                type: 'primary',
                url: `${appUrl}/cross-sell?overdue=1`,
              },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('[cron/reminders] Lark webhook returned non-OK status:', res.status);
      }
    } catch (err) {
      // Webhook 失敗でも 200 を返す（ログのみ記録）
      console.error('[cron/reminders] Lark webhook request failed:', err);
    }

    // lastReminderSentAt を更新
    const now = new Date();
    for (const row of rows) {
      try {
        await db
          .update(crossSellOpportunities)
          .set({ lastReminderSentAt: now })
          .where(eq(crossSellOpportunities.id, row.id));
      } catch (err) {
        console.error(`[cron/reminders] Failed to update lastReminderSentAt for id=${row.id}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent: rows.length, skipped: 0 });
}
