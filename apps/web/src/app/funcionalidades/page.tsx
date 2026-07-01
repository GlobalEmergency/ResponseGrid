import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/organisms/content-page';
import { CoordinationIllustration } from '@/components/atoms/illustrations';
import { JsonLd } from '@/components/atoms/json-ld';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const f = t.features_page;
  return {
    title: f.meta_title,
    description: f.meta_description,
    alternates: { canonical: '/funcionalidades' },
    openGraph: { title: f.meta_title, description: f.meta_description, url: '/funcionalidades' },
  };
}

export default async function FeaturesPage() {
  const { t } = await getT();
  const f = t.features_page;

  // ItemList of capabilities — a structured, citable inventory of what the
  // platform does, for search engines and AI assistants.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: f.h1,
    itemListElement: f.sections.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.heading,
      description: s.body,
    })),
  };

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <ContentPage
        overline={f.overline}
        h1={f.h1}
        lead={f.lead}
        illustration={<CoordinationIllustration className="w-full" />}
        cta={{ heading: f.cta_heading, body: f.cta_body, label: f.cta_button, href: '/#emergencias' }}
      >
        {f.sections.map((s) => (
          <ContentSection key={s.heading} heading={s.heading}>
            {s.body}
          </ContentSection>
        ))}
      </ContentPage>
    </>
  );
}
