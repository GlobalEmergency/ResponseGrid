'use server';

import { redirectToLogin } from '@/lib/auth';

export async function logoutAction(): Promise<void> {
  return redirectToLogin();
}
