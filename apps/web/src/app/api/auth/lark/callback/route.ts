import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/lark/callback  (旧パス — 後方互換リダイレクト)
 *
 * Lark コンソールの登録 URL は /api/auth/callback/lark に変更済み。
 * 万が一古い URL にリクエストが来た場合は新パスへ転送する。
 */
export function GET(req: NextRequest) {
  const newUrl = new URL('/api/auth/callback/lark', req.nextUrl.origin);
  // クエリパラメータをそのまま引き継ぐ
  req.nextUrl.searchParams.forEach((value, key) => {
    newUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(newUrl, { status: 301 });
}
