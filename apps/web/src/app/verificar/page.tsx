import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/organisms/content-page';
import { VerifyIllustration } from '@/components/atoms/illustrations';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const v = t.verify_page;
  return {
    title: v.meta_title,
    description: v.meta_description,
    alternates: { canonical: '/verificar' },
    openGraph: {
      title: v.meta_title,
      description: v.meta_description,
      url: '/verificar',
      siteName: 'ResponseGrid',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
    },
  };
}

export default async function VerifyPage() {
  const { t } = await getT();
  const v = t.verify_page;

  const levels = [
    { title: v.level_unverified_title, body: v.level_unverified_body, dot: 'bg-muted-soft', ring: 'border-line' },
    { title: v.level_verified_title, body: v.level_verified_body, dot: 'bg-success-dot', ring: 'border-success/30' },
    { title: v.level_official_title, body: v.level_official_body, dot: 'bg-navy', ring: 'border-navy/25' },
  ];

  const steps = [v.step1, v.step2, v.step3, v.step4];

  return (
    <ContentPage
      overline={v.overline}
      h1={v.h1}
      lead={v.lead}
      illustration={<VerifyIllustration className="w-full" />}
      cta={{ heading: v.cta_heading, body: v.cta_body, label: v.cta_button, href: '/#emergencias' }}
    >
      <ContentSection heading={v.levels_heading}>
        <div className="mt-1 grid gap-3 sm:grid-cols-3">
          {levels.map((l) => (
            <div key={l.title} className={`rounded-card border bg-surface-alt p-4 ${l.ring}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} aria-hidden="true" />
                <span className="font-display text-sm font-bold text-navy">{l.title}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-muted">{l.body}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection heading={v.steps_heading}>
        <ol className="mt-1 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy font-display text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[14.5px] leading-[1.5] text-ink-soft">{s}</span>
            </li>
          ))}
        </ol>
      </ContentSection>

      <section className="max-w-2xl rounded-card border border-warning/30 bg-warning-soft px-5 py-4">
        <h2 className="font-display text-base font-bold text-warning">⚠ {v.warning_heading}</h2>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{v.warning_body}</p>
      </section>
    </ContentPage>
  );
}
