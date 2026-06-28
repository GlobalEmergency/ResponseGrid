import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/organisms/content-page';
import { StepsIllustration } from '@/components/atoms/illustrations';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const h = t.how_page;
  return {
    title: h.meta_title,
    description: h.meta_description,
    alternates: { canonical: '/como-funciona' },
    openGraph: {
      title: h.meta_title,
      description: h.meta_description,
      url: '/como-funciona',
      siteName: 'ResponseGrid',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
    },
  };
}

export default async function HowItWorksPage() {
  const { t } = await getT();
  const h = t.how_page;

  const steps = [
    { n: '1', title: h.step1_title, body: h.step1_body },
    { n: '2', title: h.step2_title, body: h.step2_body },
    { n: '3', title: h.step3_title, body: h.step3_body, accent: true },
  ];

  const trust = [
    { dot: 'bg-muted-soft', text: h.trust_unverified },
    { dot: 'bg-success-dot', text: h.trust_verified },
    { dot: 'bg-navy', text: h.trust_official },
  ];

  return (
    <ContentPage
      overline={h.overline}
      h1={h.h1}
      lead={h.lead}
      illustration={<StepsIllustration className="w-full" />}
      cta={{ heading: h.cta_heading, body: h.cta_body, label: h.cta_button, href: '/#emergencias' }}
    >
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="rounded-card border border-line bg-surface-alt p-5">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-extrabold text-white ${
                s.accent ? 'bg-accent' : 'bg-navy'
              }`}
            >
              {s.n}
            </span>
            <h3 className="mt-3 font-display text-base font-bold text-navy">{s.title}</h3>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>

      <ContentSection heading={h.trust_heading}>
        <p>{h.trust_intro}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {trust.map((r) => (
            <li key={r.text} className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${r.dot}`} aria-hidden="true" />
              <span className="text-[14.5px] text-ink-soft">{r.text}</span>
            </li>
          ))}
        </ul>
      </ContentSection>
    </ContentPage>
  );
}
