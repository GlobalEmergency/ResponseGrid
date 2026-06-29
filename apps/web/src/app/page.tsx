import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken, authHeaders } from '@/lib/auth';
import { SiteHeaderBand } from '@/components/organisms/site-header-band';
import { EmergencyDirectoryCard } from '@/components/organisms/emergency-directory-card';
import { AccountNav } from '@/components/molecules/account-nav';
import { hasManagerRole } from '@/lib/admin-scopes';
import { HowItWorksStep } from '@/components/molecules/how-it-works-step';
import { TrustLevelsCard } from '@/components/molecules/trust-levels-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';

// Emergency list must reflect live backend state on every request.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.home.meta_title,
    description: t.home.meta_description,
  };
}

export default async function HomePage() {
  const { t } = await getT();
  const { data: emergencies } = await api.GET('/emergencies');

  // Fetch notification unread count and admin status when authenticated.
  const token = await getToken();
  let notificationUnreadCount = 0;
  let isAdmin = false;
  let canAdminister = false;
  if (token != null) {
    const [notifResult, meResult] = await Promise.all([
      api.GET('/notifications/mine', { headers: authHeaders(token) }),
      api.GET('/auth/me', { headers: authHeaders(token) }),
    ]);
    if (notifResult.data != null) {
      notificationUnreadCount = notifResult.data.unreadCount;
    }
    if (meResult.data != null) {
      isAdmin = meResult.data.isAdmin === true;
      canAdminister = isAdmin || hasManagerRole(meResult.data.grants ?? []);
    }
  }

  const all = emergencies ?? [];
  const activeEmergencies = all.filter((e) => e.status === 'active');
  const closedEmergencies = all.filter((e) => e.status !== 'active');

  const th = t.home;
  const sectionHeading = 'font-display text-lg font-bold text-navy';

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl bg-surface">
        <SiteHeaderBand />

        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          {/* ── Hero (SEO H1) ───────────────────────────────────────────── */}
          <section>
            <h1 className="font-display text-[27px] font-extrabold leading-[1.1] tracking-tight text-navy lg:text-[40px] lg:leading-[1.05]">
              {th.hero_h1}
            </h1>
            <p className="mt-3.5 max-w-2xl text-[15px] leading-[1.55] text-ink-soft lg:text-base">{th.hero_subtitle}</p>
            <div className="mt-[18px] flex gap-2.5 sm:max-w-md">
              <a
                href="#emergencias"
                className="flex-1 rounded-xl bg-navy px-4 py-3.5 text-center text-[15px] font-bold text-white transition-colors hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {th.hero_cta_emergencies}
              </a>
              <a
                href="#emergencias"
                className="rounded-xl border-[1.5px] border-line-strong bg-white px-5 py-3.5 text-center text-[15px] font-bold text-navy transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {th.hero_cta_donate}
              </a>
            </div>
          </section>

          {/* ── Emergencias activas ─────────────────────────────────────── */}
          <section id="emergencias" aria-labelledby="emergencias-heading" className="scroll-mt-4">
            <div className="mb-3.5 flex items-baseline justify-between gap-2">
              <h2 id="emergencias-heading" className={sectionHeading}>{th.active_emergencies}</h2>
              {activeEmergencies.length > 0 && (
                <span className="text-xs text-muted-soft">
                  {th.active_count.replace('{count}', String(activeEmergencies.length))}
                </span>
              )}
            </div>

            {activeEmergencies.length === 0 ? (
              <EmptyState title={th.no_emergencies_title} description={th.no_emergencies_description} />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label={th.aria_emergency_list}>
                {activeEmergencies.map((emergency) => (
                  <li key={emergency.id}>
                    <EmergencyDirectoryCard
                      emergency={emergency}
                      activeLabel={th.emergency_status_active}
                      enterLabel={th.enter_operation}
                    />
                  </li>
                ))}
              </ul>
            )}

            {closedEmergencies.length > 0 && (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {closedEmergencies.map((emergency) => (
                  <Link
                    key={emergency.id}
                    href={`/e/${emergency.slug}`}
                    className="flex items-center gap-2.5 rounded-card border border-line bg-surface-alt px-4 py-3.5 transition-colors hover:border-navy/20 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-soft" aria-hidden="true" />
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-muted">{emergency.name}</span>
                      <span className="block text-[11.5px] text-muted-soft">{th.closed_label}</span>
                    </span>
                    <span className="text-muted-soft" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Cómo funciona ───────────────────────────────────────────── */}
          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className={`${sectionHeading} mb-3.5`}>{th.how_it_works_heading}</h2>
            <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
              <HowItWorksStep index={1} title={th.step1_title} body={th.step1_body} />
              <HowItWorksStep index={2} title={th.step2_title} body={th.step2_body} />
              <HowItWorksStep index={3} title={th.step3_title} body={th.step3_body} tone="accent" />
            </div>
          </section>

          {/* ── La confianza es el producto ─────────────────────────────── */}
          <TrustLevelsCard
            heading={th.trust_heading}
            intro={th.trust_intro}
            rows={[
              { level: 'unverified', text: th.trust_unverified },
              { level: 'verified', text: th.trust_verified },
              { level: 'official', text: th.trust_official },
            ]}
            tVerification={t.verification_badge}
          />

          <AccountNav
            t={th}
            authed={token !== null}
            isAdmin={isAdmin}
            canAdminister={canAdminister}
            notificationUnreadCount={notificationUnreadCount}
          />
        </div>
      </div>
    </main>
  );
}
