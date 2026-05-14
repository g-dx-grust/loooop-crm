import { NextRequest, NextResponse } from 'next/server';
import { db, customers, eq } from '@looop/db';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.replace(/[^0-9]/g, '');

  if (!phone || phone.length < 10) {
    return NextResponse.json({ duplicated: false });
  }

  // In local dev: phone_enc stores plain text
  const rows = await db
    .select({ id: customers.id, deletedAt: customers.deletedAt })
    .from(customers)
    .where(eq(customers.phoneEnc, Buffer.from(phone) as unknown as Buffer))
    .limit(1);

  const liveRow = rows.find((r) => r.deletedAt === null || r.deletedAt === undefined);
  if (liveRow) {
    return NextResponse.json({ duplicated: true, existingCustomerId: liveRow.id });
  }

  return NextResponse.json({ duplicated: false });
}
