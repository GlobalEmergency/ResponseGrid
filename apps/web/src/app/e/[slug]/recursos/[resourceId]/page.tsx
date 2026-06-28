import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { PublicResourceCard } from '@/components/organisms/public-resource-card';
import { NeedCard } from '@/components/molecules/need-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; resourceId: string }>;
};

/**
 * Public detail page for a single resource / final recipient: its ficha plus
 * the list of needs linked to it (1‑a‑N, via ?resourceId=). EPIC #59.
 */
export default async function RecipientResourcePage({ params }: Props) {
  const { slug, resourceId } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t, locale } = await getT();

  if (!emergency) {
    notFound();
  }

  const emergencyId = emergency.id;
  const isActive = emergency.status === 'active';

  const [{ data: resource }, { data: needs }] = await Promise.all([
    api.GET('/emergencies/{emergencyId}/public/resources/{resourceId}', {
      params: { path: { emergencyId, resourceId } },
    }),
    api.GET('/emergencies/{emergencyId}/public/needs', {
      params: { path: { emergencyId }, query: { resourceId } },
    }),
  ]);

  if (!resource) {
    notFound();
  }

  const te = t.emergency;
  const td = t.resource_detail;
  const recipientNeeds = needs ?? [];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-md bg-surface lg:max-w-3xl">
        <div className="flex flex-col gap-5 px-4 pb-12 pt-5 lg:gap-6 lg:px-8">
          <Link
            href={`/e/${slug}`}
            className="w-fit text-sm font-semibold text-navy hover:underline"
          >
            ← {td.back}
          </Link>

          <PublicResourceCard
            resource={resource}
            t={t.resource_card}
            tVerification={t.verification_badge}
            tStatusLight={t.status_light}
            locale={locale}
          />

          <section
            aria-labelledby="recipient-needs-heading"
            className="flex flex-col gap-3"
          >
            <h2
              id="recipient-needs-heading"
              className="font-display text-base font-bold text-navy"
            >
              {td.needs_heading}
            </h2>
            {recipientNeeds.length === 0 ? (
              <EmptyState title={td.needs_empty} />
            ) : (
              <ul className="flex flex-col gap-2.5" role="list">
                {recipientNeeds.map((need) => (
                  <li key={need.id}>
                    <NeedCard
                      need={need}
                      te={te}
                      slug={slug}
                      active={isActive}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
