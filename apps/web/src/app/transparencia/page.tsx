import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/organisms/content-page';
import { ShieldIllustration } from '@/components/atoms/illustrations';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';
import { getT } from '@/i18n/server';

const GITHUB = 'https://github.com/GlobalEmergency/ResponseGrid';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const tr = t.transparency;
  return {
    title: tr.meta_title,
    description: tr.meta_description,
    alternates: { canonical: '/transparencia' },
    openGraph: {
      title: tr.meta_title,
      description: tr.meta_description,
      url: '/transparencia',
      siteName: 'ResponseGrid',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
    },
  };
}

export default async function TransparencyPage() {
  const { t } = await getT();
  const tr = t.transparency;
  const tf = t.common.footer;

  const legalLink =
    'font-semibold text-navy underline underline-offset-2 hover:text-accent';

  return (
    <ContentPage
      overline={tr.overline}
      h1={tr.h1}
      lead={tr.lead}
      illustration={<ShieldIllustration className="w-full" />}
      cta={{ heading: tr.cta_heading, body: tr.cta_body, label: tr.cta_button, href: GITHUB, external: true }}
    >
      <ContentSection heading={tr.verify_heading}>{tr.verify_body}</ContentSection>
      <ContentSection heading={tr.data_heading}>{tr.data_body}</ContentSection>
      <ContentSection heading={tr.license_heading}>{tr.license_body}</ContentSection>
      <ContentSection heading={tr.governance_heading}>{tr.governance_body}</ContentSection>
      <ContentSection heading={tr.legal_heading}>
        <p>{tr.legal_body}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <a href={GLOBAL_EMERGENCY.privacy} target="_blank" rel="noopener noreferrer" className={legalLink}>
            {tf.privacy} →
          </a>
          <a href={GLOBAL_EMERGENCY.terms} target="_blank" rel="noopener noreferrer" className={legalLink}>
            {tf.terms} →
          </a>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
