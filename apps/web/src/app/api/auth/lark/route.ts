import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/lark
 *
 * LARK_APP_ID が設定されている場合: Lark OAuth 認可エンドポイントへリダイレクト。
 * 未設定の場合: モックコールバックへリダイレクト（開発環境用）。
 *
 * 必要な環境変数:
 *   LARK_APP_ID      — Lark Open Platform のアプリ ID
 *   LARK_APP_SECRET  — Lark Open Platform のアプリシークレット
 */
export function GET(req: NextRequest) {
  const appId = process.env.LARK_APP_ID;
  const callbackBase = req.nextUrl.origin;
  const redirectUri = `${callbackBase}/api/auth/lark/callback`;
  const next = req.nextUrl.searchParams.get('next') ?? '/customers';

  if (!appId) {
    // 開発用モック: コールバックを直接呼ぶ
    const mockUrl = new URL('/api/auth/lark/callback', callbackBase);
    mockUrl.searchParams.set('mock', '1');
    mockUrl.searchParams.set('next', next);
    return NextResponse.redirect(mockUrl);
  }

  // Lark OAuth 2.0 認可 URL
  // https://open.feishu.cn/open-apis/authen/v1/authorize
  const authUrl = new URL('https://open.feishu.cn/open-apis/authen/v1/authorize');
  authUrl.searchParams.set('app_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'contact:user.email:readonly');
  authUrl.searchParams.set('state', encodeURIComponent(next));
  return NextResponse.redirect(authUrl);
}
