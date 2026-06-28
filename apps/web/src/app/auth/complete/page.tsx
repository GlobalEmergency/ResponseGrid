'use client';

import { useEffect, useRef } from 'react';
import { completeOAuthAction } from './actions';

/**
 * Landing page after OAuth redirect.
 *
 * The backend sends the browser here with the JWT in the URL fragment:
 *   /auth/complete#token=<jwt>
 *
 * Fragments are never sent to the server, so we read it client-side and
 * pass it to a Server Action that stores it in an httpOnly cookie.
 */
export default function AuthCompletePage() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const hash = window.location.hash; // e.g. "#token=eyJ..."
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const token = params.get('token');

    if (!token) {
      window.location.replace('/login?error=oauth_failed');
      return;
    }

    // Call the Server Action — it will set the cookie and redirect to /
    void completeOAuthAction(token);
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center bg-white">
      <p className="text-base text-gray-500">Conectando…</p>
    </main>
  );
}
