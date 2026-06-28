'use server';

import { redirect } from 'next/navigation';
import { clearToken } from '@/lib/auth';

/**
 * Global logout server action. Clears the auth cookie and returns to /login.
 * Shared by the app shell's AccountMenu and any page-level logout control.
 */
export async function logoutAction(): Promise<void> {
  await clearToken();
  redirect('/login');
}
