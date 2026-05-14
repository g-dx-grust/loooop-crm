'use server';

import { loginWithPassword } from '@looop/auth';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function passwordLoginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const result = await loginWithPassword(email, password);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}
