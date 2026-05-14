import { type NextRequest, NextResponse } from 'next/server';
import { createSessionForUser } from '@looop/auth';
import { db, users, eq } from '@looop/db';

/**
 * GET /api/auth/callback/lark
 *
 * Lark OAuth コールバック。code を受け取りアクセストークンを取得し、
 * ユーザー情報のメールアドレスで DB と照合してセッションを発行する。
 *
 * ?mock=1 の場合: STUB_LARK_EMAIL でモックログイン（LARK_CLIENT_ID 未設定時）。
 *
 * 必要な環境変数:
 *   LARK_CLIENT_ID     — Lark App ID
 *   LARK_CLIENT_SECRET — Lark App Secret
 *   LARK_REDIRECT_URI  — このエンドポイントの URL
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const isMock = searchParams.get('mock') === '1';

  // state パラメータから next パスを復元
  // URLSearchParams.get() は自動デコード済みの値を返す
  const stateNext = searchParams.get('state') ?? '';
  const nextFromState = stateNext.startsWith('/') ? stateNext : '/customers';
  // モック時は ?next= クエリパラメータを使用
  const next = isMock ? (searchParams.get('next') ?? '/customers') : nextFromState;

  try {
    let userEmail: string | null = null;
    let larkOpenId: string | null = null;
    let larkName: string | null = null;

    if (isMock) {
      userEmail = process.env.STUB_LARK_EMAIL ?? 'kawaguchi@n-grust.co.jp';
    } else {
      const code = searchParams.get('code');
      if (!code) {
        return NextResponse.redirect(new URL('/login?error=lark_no_code', origin));
      }

      const clientId = process.env.LARK_CLIENT_ID;
      const clientSecret = process.env.LARK_CLIENT_SECRET;
      const redirectUri =
        process.env.LARK_REDIRECT_URI ?? `${origin}/api/auth/callback/lark`;

      console.log('[lark-callback] clientId present:', !!clientId, '/ redirectUri:', redirectUri);

      if (!clientId || !clientSecret) {
        return NextResponse.redirect(new URL('/login?error=lark_config', origin));
      }

      // 1. 認可コードをアクセストークンに交換
      const tokenRes = await fetch(
        'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          }),
        },
      );

      if (!tokenRes.ok) {
        console.error('[lark-callback] token HTTP error:', tokenRes.status, await tokenRes.text().catch(() => ''));
        return NextResponse.redirect(new URL('/login?error=lark_token', origin));
      }

      const tokenData = (await tokenRes.json()) as {
        code: number;
        msg?: string;
        data?: { access_token?: string };
      };

      if (tokenData.code !== 0 || !tokenData.data?.access_token) {
        console.error('[lark-callback] token error: code=', tokenData.code, 'msg=', tokenData.msg);
        return NextResponse.redirect(new URL('/login?error=lark_token', origin));
      }

      // 2. アクセストークンでユーザー情報取得
      const userRes = await fetch(
        'https://open.feishu.cn/open-apis/authen/v1/user_info',
        {
          headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
        },
      );

      if (!userRes.ok) {
        return NextResponse.redirect(new URL('/login?error=lark_userinfo', origin));
      }

      const userData = (await userRes.json()) as {
        code: number;
        data?: {
          email?: string;
          enterprise_email?: string;
          open_id?: string;
          name?: string;
        };
      };

      if (userData.code !== 0) {
        return NextResponse.redirect(new URL('/login?error=lark_userinfo', origin));
      }

      // enterprise_email を優先（社内ドメインのメール）
      userEmail =
        userData.data?.enterprise_email ?? userData.data?.email ?? null;
      larkOpenId = userData.data?.open_id ?? null;
      larkName = userData.data?.name ?? null;
    }

    if (!userEmail) {
      return NextResponse.redirect(new URL('/login?error=lark_no_email', origin));
    }

    // DB でメールアドレス照合（大文字小文字を統一）
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
      .limit(1);

    const u = rows[0];
    if (!u || u.deletedAt || u.status !== 'active') {
      return NextResponse.redirect(new URL('/login?error=lark_not_found', origin));
    }

    // Lark 情報を DB に保存（初回ログイン時に紐付け）
    await db
      .update(users)
      .set({
        authProvider: 'lark',
        larkEmail: userEmail.toLowerCase(),
        ...(larkOpenId ? { larkUserId: larkOpenId } : {}),
        ...(larkName ? { larkName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, u.id));

    await createSessionForUser(u.id);

    const destination = next.startsWith('/') ? next : '/customers';
    return NextResponse.redirect(new URL(destination, origin));
  } catch (err) {
    console.error('[lark-callback] unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=lark_error', origin));
  }
}
