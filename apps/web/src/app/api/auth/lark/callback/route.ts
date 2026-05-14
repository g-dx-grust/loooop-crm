import { type NextRequest, NextResponse } from 'next/server';
import { createSessionForUser } from '@looop/auth';
import { db, users, eq } from '@looop/db';

/**
 * GET /api/auth/lark/callback
 *
 * Lark OAuth コールバック。code を受け取ってユーザー情報を取得し、
 * DB のメールアドレスと照合してセッションを発行する。
 *
 * ?mock=1 の場合: STUB_LARK_EMAIL または kawaguchi@n-grust.co.jp でモックログイン。
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const next = searchParams.get('next') ?? '/customers';
  const isMock = searchParams.get('mock') === '1';

  try {
    let userEmail: string | null = null;

    if (isMock) {
      userEmail = process.env.STUB_LARK_EMAIL ?? 'kawaguchi@n-grust.co.jp';
    } else {
      const code = searchParams.get('code');
      if (!code) {
        return NextResponse.redirect(new URL('/login?error=lark_no_code', origin));
      }

      const appId = process.env.LARK_APP_ID;
      const appSecret = process.env.LARK_APP_SECRET;
      if (!appId || !appSecret) {
        return NextResponse.redirect(new URL('/login?error=lark_config', origin));
      }

      // 1. アクセストークン取得
      const tokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          app_id: appId,
          app_secret: appSecret,
        }),
      });

      if (!tokenRes.ok) {
        return NextResponse.redirect(new URL('/login?error=lark_token', origin));
      }

      const tokenData = (await tokenRes.json()) as {
        code: number;
        data?: { access_token?: string };
      };

      if (tokenData.code !== 0 || !tokenData.data?.access_token) {
        return NextResponse.redirect(new URL('/login?error=lark_token', origin));
      }

      // 2. ユーザー情報取得
      const userRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers: { Authorization: `Bearer ${tokenData.data.access_token}` },
      });

      if (!userRes.ok) {
        return NextResponse.redirect(new URL('/login?error=lark_userinfo', origin));
      }

      const userData = (await userRes.json()) as {
        code: number;
        data?: { email?: string; enterprise_email?: string; open_id?: string };
      };

      if (userData.code !== 0) {
        return NextResponse.redirect(new URL('/login?error=lark_userinfo', origin));
      }

      userEmail = userData.data?.enterprise_email ?? userData.data?.email ?? null;
    }

    if (!userEmail) {
      return NextResponse.redirect(new URL('/login?error=lark_no_email', origin));
    }

    // DB でメールアドレス照合
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
      .limit(1);

    const u = rows[0];
    if (!u || u.deletedAt || u.status !== 'active') {
      return NextResponse.redirect(new URL('/login?error=lark_not_found', origin));
    }

    await createSessionForUser(u.id);

    const nextUrl = new URL(next.startsWith('/') ? next : '/customers', origin);
    return NextResponse.redirect(nextUrl);
  } catch {
    return NextResponse.redirect(new URL('/login?error=lark_error', origin));
  }
}
