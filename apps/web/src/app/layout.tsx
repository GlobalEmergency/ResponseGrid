import type { Metadata } from 'next';
import { Archivo, Public_Sans } from 'next/font/google';
import './globals.css';
import { SwRegister } from '@/components/providers/sw-register';
import { GlobalFooter } from '@/components/organisms/global-footer';
import { JsonLd } from '@/components/atoms/json-ld';
import { getT } from '@/i18n/server';
import { LocaleProvider } from '@/i18n/locale-context';
import { GLOBAL_EMERGENCY } from '@/lib/global-emergency';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://responsegrid.app'),
  title: 'ResponseGrid',
  description: 'Coordinación de ayuda en emergencias — un proyecto de Global Emergency',
  applicationName: 'ResponseGrid',
  openGraph: {
    siteName: 'ResponseGrid',
    type: 'website',
    locale: 'es_ES',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ResponseGrid' }],
  },
  twitter: {
    card: 'summary',
    title: 'ResponseGrid',
    description: 'Coordinación de ayuda en emergencias — un proyecto de Global Emergency',
    images: ['/icons/icon-512.png'],
  },
};

// Organisation + site identity so AI assistants and search engines recognise
// ResponseGrid as an entity and attribute it to Global Emergency.
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ResponseGrid',
  url: 'https://responsegrid.app',
  description:
    'Plataforma open source de coordinación de ayuda material y logística en emergencias.',
  parentOrganization: {
    '@type': 'Organization',
    name: 'Global Emergency',
    url: GLOBAL_EMERGENCY.site,
  },
  sameAs: [GLOBAL_EMERGENCY.site],
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ResponseGrid',
  url: 'https://responsegrid.app',
  inLanguage: 'es',
  publisher: { '@type': 'Organization', name: 'Global Emergency', url: GLOBAL_EMERGENCY.site },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getT();

  return (
    <html lang={locale} className={`h-full ${archivo.variable} ${publicSans.variable}`}>
      <body className="min-h-full flex flex-col bg-surface text-ink antialiased font-sans">
        <LocaleProvider locale={locale}>
          {children}
          <GlobalFooter tf={t.common.footer} />
        </LocaleProvider>
        <JsonLd data={orgJsonLd} />
        <JsonLd data={siteJsonLd} />
        <SwRegister />
      </body>
    </html>
  );
}
