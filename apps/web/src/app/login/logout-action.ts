'use server';

import { logout } from '@looop/auth';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function logoutAction(): Promise<void> {
  // 独自 HMAC セッション Cookie を削除
  await logout();

  // Supabase Auth セッションも削除（メール+パスワードログイン時に発行されるため）
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Supabase セッションがない場合は無視
  }
}
