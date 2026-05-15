'use server';

import { loginWithPassword } from '@looop/auth';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function passwordLoginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  return loginWithPassword(email, password);
}
