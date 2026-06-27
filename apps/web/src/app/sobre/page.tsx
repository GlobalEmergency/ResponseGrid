import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/organisms/content-page';
import { CoordinationIllustration } from '@/components/atoms/illustrations';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const a = t.about;
  return {
    title: a.meta_title,
    description: a.meta_description,
    alternates: { canonical: '/sobre' },
    openGraph: {
      title: a.meta_title,
      description: a.meta_description,
      url: '/sobre',
      siteName: 'ResponseGrid',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
    },
  };
}

export default async function AboutPage() {
  const { t } = await getT();
  const a = t.about;

  const stats = [
    { value: a.stat_open_value, label: a.stat_open },
    { value: a.stat_realtime_value, label: a.stat_realtime },
    { value: a.stat_data_value, label: a.stat_data },
  ];

  return (
    <ContentPage
      overline={a.overline}
      h1={a.h1}
      lead={a.lead}
      illustration={<CoordinationIllustration className="w-full" />}
      cta={{ heading: a.cta_heading, body: a.cta_body, label: a.cta_button, href: '/#emergencias' }}
    >
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-surface-alt px-3 py-4 text-center">
            <p className="font-display text-2xl font-extrabold text-navy lg:text-3xl">{s.value}</p>
            <p className="mt-1 text-[12px] leading-tight text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <ContentSection heading={a.mission_heading}>{a.mission_body}</ContentSection>
      <ContentSection heading={a.how_heading}>{a.how_body}</ContentSection>
      <ContentSection heading={a.open_heading}>{a.open_body}</ContentSection>
      <ContentSection heading={a.ge_heading}>
        {a.ge_body}{' '}
        <a
          href={GLOBAL_EMERGENCY.site}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-navy underline underline-offset-2 hover:text-accent"
        >
          {a.ge_link} →
        </a>
      </ContentSection>
    </ContentPage>
  );
}
