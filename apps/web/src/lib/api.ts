import { createResponseGridClient } from '@responsegrid/api-client';

/**
 * Pre-configured API client — use ONLY in Server Components or Server Actions.
 * Never import this in Client Components ('use client').
 */
export const api = createResponseGridClient(
  process.env.API_URL ?? 'http://localhost:3000',
);
