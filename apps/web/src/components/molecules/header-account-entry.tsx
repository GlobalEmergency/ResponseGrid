/**
 * HeaderAccountEntry — a "Mi panel" bridge shown in the public header band for
 * authenticated viewers. The role-aware nav (PR #87 sidebar/drawer) only exists
 * inside the dashboard sections, so a signed-in user on the home or any public
 * page would otherwise have no way to reach it. This gives them a one-tap route
 * into /dashboard, where the full menu lives. Renders nothing for anonymous
 * visitors. Cheap by design: a cookie read only — no API call — since
 * /dashboard itself revalidates the session and redirects if it has expired.
 */
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { getT } from '@/i18n/server';

export async function HeaderAccountEntry() {
  const token = await getToken();
  if (token == null) return null;

  const { t } = await getT();

  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      {t.common.my_panel}
    </Link>
  );
}
