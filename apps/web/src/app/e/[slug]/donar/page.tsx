import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { HelpActionRow } from '@/components/molecules/help-action-row';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const emergency = await getEmergencyBySlug(slug);
  const { t } = await getT();

  if (!emergency) {
    return { title: 'Emergencia no encontrada · ResponseGrid' };
  }

  return {
    title: t.donar.choose_meta_title.replace('{emergencyName}', emergency.name),
    description: t.donar.meta_description.replace(
      '{emergencyName}',
      emergency.name,
    ),
  };
}

/**
 * Donation hub (#130): the entry point for donating splits the two distinct
 * intents that used to be conflated — bringing material to a specific point
 * (pre-registration, with a code/QR) vs. offering material for the coordination
 * team to handle. Public: choosing doesn't require login.
 */
export default async function DonarSelectorPage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();

  const emergency = await getEmergencyBySlug(slug);
  if (!emergency) {
    notFound();
  }

  const td = t.donar;

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand
          backHref={`/e/${slug}`}
          backLabel={t.common.back_to_emergency}
          title={td.choose_title}
          subtitle={td.choose_subtitle}
        />
        <div className="flex flex-col gap-3 px-4 pb-12 pt-6">
          <HelpActionRow
            href={`/e/${slug}/pre-registro`}
            icon="📦"
            title={td.choose_deliver_title}
            subtitle={td.choose_deliver_subtitle}
            variant="primary"
          />
          <HelpActionRow
            href={`/e/${slug}/donar/ofrecer`}
            icon="🤝"
            title={td.choose_offer_title}
            subtitle={td.choose_offer_subtitle}
          />
        </div>
      </div>
    </main>
  );
}
