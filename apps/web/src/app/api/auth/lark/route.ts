import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/lark
 *
 * Lark OAuth 認可エンドポイントへリダイレクトする。
 * LARK_CLIENT_ID が未設定の場合はモックコールバックへ直接リダイレクト（開発用）。
 *
 * 必要な環境変数:
 *   LARK_CLIENT_ID    — Lark Open Platform のクライアント ID (= App ID)
 *   LARK_REDIRECT_URI — Lark コンソールに登録したリダイレクト URI
 */
export function GET(req: NextRequest) {
  const clientId = process.env.LARK_CLIENT_ID;
  const redirectUri =
    process.env.LARK_REDIRECT_URI ??
    `${req.nextUrl.origin}/api/auth/callback/lark`;
  const next = req.nextUrl.searchParams.get('next') ?? '/customers';

  if (!clientId) {
    // 開発用モック: コールバックを直接呼ぶ
    const mockUrl = new URL('/api/auth/callback/lark', req.nextUrl.origin);
    mockUrl.searchParams.set('mock', '1');
    mockUrl.searchParams.set('next', next);
    return NextResponse.redirect(mockUrl);
  }

  // Lark OAuth 2.0 認可 URL
  // https://open.feishu.cn/open-apis/authen/v1/authorize
  const authUrl = new URL('https://open.feishu.cn/open-apis/authen/v1/authorize');
  authUrl.searchParams.set('app_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  // URLSearchParams.set() が自動でパーセントエンコードするため手動 encode 不要
  authUrl.searchParams.set('state', next);
  return NextResponse.redirect(authUrl);
}
