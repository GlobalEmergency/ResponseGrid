'use client';

import { useEffect, useRef } from 'react';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { completeOAuthAction } from './actions';

/**
 * Landing page after OAuth redirect.
 *
 * The backend sends the browser here with the JWT in the URL fragment, plus an
 * optional return path:
 *   /auth/complete#token=<jwt>&next=<path>
 *
 * Fragments are never sent to the server, so we read them client-side and
 * pass them to a Server Action that stores the token in an httpOnly cookie and
 * redirects to `next` (the page that originally triggered the login).
 */
export default function AuthCompletePage() {
  const t = getMessages(useLocale()).auth_complete;
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const hash = window.location.hash; // e.g. "#token=eyJ...&next=%2Fgrupos"
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const token = params.get('token');
    const next = params.get('next');

    if (!token) {
      window.location.replace('/login?error=oauth_failed');
      return;
    }

    // Call the Server Action — it sets the cookie and redirects to `next` (or /).
    void completeOAuthAction(token, next ?? undefined);
  }, []);

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand />
        <div className="flex flex-col items-center text-center gap-6 px-4 pb-12 pt-6">
          <p className="text-base text-muted">{t.connecting}</p>
        </div>
      </div>
    </main>
  );
}
