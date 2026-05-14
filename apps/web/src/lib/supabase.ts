/**
 * Supabase SSR クライアントファクトリ。
 * Server Components / Server Actions / Route Handlers で使う。
 *
 * セッション管理は @looop/auth の独自 HMAC cookie が担当する。
 * このクライアントはパスワード照合（signInWithPassword）専用。
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components では cookie の書き込みができない場合があるが
            // 認証検証用途では読み取りのみ必要なので無視して良い
          }
        },
      },
    },
  );
}
