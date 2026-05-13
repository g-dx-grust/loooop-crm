import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  db,
  customers,
  customerAddresses,
  looopContracts,
  crossSellOpportunities,
  eq,
  and,
  isNull,
} from '@looop/db';

type AiScore = 'A' | 'B' | 'C';

interface ScoreResult {
  score: AiScore;
  reason: string;
}

function buildPrompt(data: {
  ageRange: string | null;
  residenceType: string | null;
  ownershipType: string | null;
  monthlyElectricBill: number | null;
  householdInfo: string | null;
  looopStatus: string | null;
  memo: string | null;
}): string {
  return `あなたは太陽光発電の営業分析AIです。
以下の顧客情報から、太陽光発電の見込み度をA/B/Cで判定してください。

【顧客情報】
- 年齢層: ${data.ageRange ?? '不明'}
- 住居種別: ${data.residenceType ?? '不明'}（戸建て/集合住宅等）
- 所有形態: ${data.ownershipType ?? '不明'}（持ち家/賃貸等）
- 月額電気代: ${data.monthlyElectricBill != null ? `${data.monthlyElectricBill}円` : '不明'}
- 世帯情報: ${data.householdInfo ?? '不明'}
- Looop契約状況: ${data.looopStatus ?? '不明'}
- メモ: ${data.memo ?? 'なし'}

【判定基準】
A（高見込み）: 持ち家の戸建て、月額電気代10,000円以上、30〜60代
B（中見込み）: 持ち家だが集合住宅、または電気代が不明など情報不足
C（低見込み）: 賃貸、集合住宅の賃貸、またはLooop契約なし

以下のJSON形式のみで回答してください。それ以外のテキストは不要です:
{"score": "A", "reason": "持ち家の戸建てで月額電気代が15,000円と高く、40代世帯主のため太陽光導入の動機が強い。"}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. 入力バリデーション
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).customerId !== 'string' ||
    typeof (body as Record<string, unknown>).opportunityId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'customerId と opportunityId は文字列で指定してください' },
      { status: 400 },
    );
  }

  const { customerId, opportunityId } = body as { customerId: string; opportunityId: string };

  // 2. DB から顧客情報を取得
  const customerRows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
    .limit(1);

  const customer = customerRows[0];
  if (!customer) {
    return NextResponse.json({ error: '顧客が見つかりません' }, { status: 404 });
  }

  // 住所（プライマリ）
  const addressRows = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.isPrimary, true),
        isNull(customerAddresses.deletedAt),
      ),
    )
    .limit(1);
  const address = addressRows[0] ?? null;

  // Looop契約（最新）
  const contractRows = await db
    .select()
    .from(looopContracts)
    .where(and(eq(looopContracts.customerId, customerId), isNull(looopContracts.deletedAt)))
    .limit(1);
  const contract = contractRows[0] ?? null;

  // クロスセル機会（対象確認）
  const opportunityRows = await db
    .select()
    .from(crossSellOpportunities)
    .where(
      and(
        eq(crossSellOpportunities.id, opportunityId),
        eq(crossSellOpportunities.customerId, customerId),
        isNull(crossSellOpportunities.deletedAt),
      ),
    )
    .limit(1);

  if (!opportunityRows[0]) {
    return NextResponse.json({ error: 'クロスセル機会が見つかりません' }, { status: 404 });
  }

  // 3. ANTHROPIC_API_KEY 未設定の場合はデフォルト返却
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ score: 'C', reason: 'AI APIが未設定です' });
  }

  // 4. Claude API に分析依頼
  const prompt = buildPrompt({
    ageRange: customer.ageRange ?? null,
    residenceType: address?.residenceType ?? null,
    ownershipType: address?.ownershipType ?? null,
    monthlyElectricBill: contract?.monthlyElectricBill ?? null,
    householdInfo: customer.householdInfo ?? null,
    looopStatus: contract?.status ?? null,
    memo: customer.memo ?? null,
  });

  let result: ScoreResult = { score: 'C', reason: '判定できませんでした' };

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = (message.content[0] as { type: 'text'; text: string }).text;

    // JSON パース（フォールバック付き）
    try {
      // Claude がコードブロックで返してくる場合があるので除去
      const cleaned = rawText.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as { score: unknown; reason: unknown };

      if (
        typeof parsed.score === 'string' &&
        ['A', 'B', 'C'].includes(parsed.score) &&
        typeof parsed.reason === 'string'
      ) {
        result = {
          score: parsed.score as AiScore,
          reason: parsed.reason,
        };
      }
    } catch {
      // JSON パース失敗 → デフォルトを使用
    }
  } catch {
    // API 呼び出し失敗 → デフォルトを返す（500 にしない）
    return NextResponse.json({ score: 'C', reason: 'AI APIの呼び出しに失敗しました' });
  }

  // 5. DB に保存
  await db
    .update(crossSellOpportunities)
    .set({
      aiScore: result.score,
      aiScoreReason: result.reason,
      aiScoredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crossSellOpportunities.id, opportunityId));

  // 6. レスポンス
  return NextResponse.json(result);
}
