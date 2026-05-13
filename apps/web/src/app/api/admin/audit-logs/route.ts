import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/app/(admin)/admin/queries';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const result = await getAuditLogs({ search, from, to, page });
  return NextResponse.json(result);
}
