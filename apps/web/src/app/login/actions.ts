'use server';

import { createSupabaseServerClient } from '@/lib/supabase';
import { createSessionForUser } from '@looop/auth';
import { db, users, eq } from '@looop/db';

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * メール + パスワードでログイン。
 *
 * 認証フロー:
 *   1. Supabase Auth でパスワードを検証 (public.users.password_hash は使わない)
 *   2. public.users でアカウント有効性・権限を確認
 *   3. 独自 HMAC セッション Cookie を発行
 *
 * ミドルウェア・getCurrentUser・Lark SSO は変更不要。
 */
export async function passwordLoginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { success: false, error: 'メールアドレスとパスワードを入力してください' };
  }

  // 1. Supabase Auth でパスワード照合
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  // 2. public.users でアカウントの有効性を確認
  const rows = await db
    .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const u = rows[0];
  if (!u || u.deletedAt || u.status !== 'active') {
    return {
      success: false,
      error: 'このアカウントは利用できません。管理者にお問い合わせください。',
    };
  }

  // 3. 独自 HMAC セッション発行（ミドルウェアが検証する Cookie）
  await createSessionForUser(u.id);

  return { success: true };
}
