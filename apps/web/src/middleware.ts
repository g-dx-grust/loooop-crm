/**
 * セッションクッキーが無い場合は /login へリダイレクトする。
 * トークンの HMAC 検証は Edge ランタイムの crypto.subtle で行う。
 */

import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'looop_session';
const SECRET = process.env.AUTH_SECRET ?? 'looop-crm-dev-secret-please-rotate-in-production';

// 認証不要のパス
const PUBLIC_PATHS = ['/login', '/api/health', '/api/auth/lark', '/api/auth/callback'];

async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  // base64url
  const bytes = new Uint8Array(sig);
  let s = '';
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function isValidToken(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const encoded = parts[0];
  const sig = parts[1];
  if (!encoded || !sig) return false;
  const expected = await hmacSha256(SECRET, encoded);
  if (sig !== expected) return false;
  try {
    const payload = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const segs = payload.split('|');
    const expStr = segs[1];
    if (!expStr) return false;
    const expiresAt = Number(expStr);
    if (Number.isNaN(expiresAt)) return false;
    if (Date.now() > expiresAt) return false;
  } catch {
    return false;
  }
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public path
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token && (await isValidToken(token))) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  if (pathname !== '/' && pathname !== '/login') {
    loginUrl.searchParams.set('next', pathname + (req.nextUrl.search || ''));
  } else {
    loginUrl.search = '';
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 静的アセット・Next 内部・画像・favicon を除外
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'],
};
