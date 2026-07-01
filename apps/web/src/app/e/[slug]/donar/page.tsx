import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEmergencyBySlug } from '@/lib/emergencies';
import { AppBar } from '@/components/organisms/app-bar';
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
        <AppBar variant="action" slug={slug} backHref={`/e/${slug}`} />
        <div className="px-4 pt-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy">
            {td.choose_title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{td.choose_subtitle}</p>
        </div>
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
