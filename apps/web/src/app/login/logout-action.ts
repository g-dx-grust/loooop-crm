'use server';

import { logout } from '@looop/auth';

export async function logoutAction(): Promise<void> {
  await logout();
}
