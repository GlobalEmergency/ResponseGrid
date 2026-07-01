import type { Metadata } from 'next';
import { Archivo, Public_Sans } from 'next/font/google';
import './globals.css';
import { SwRegister } from '@/components/providers/sw-register';
import { GlobalFooter } from '@/components/organisms/global-footer';
import { getT } from '@/i18n/server';
import { LocaleProvider } from '@/i18n/locale-context';
import { CategoriesProvider } from '@/components/providers/categories-provider';
import { getCategoriesCached } from '@/adapters/get-categories';

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getT();
  const categories = await getCategoriesCached(locale);

  return (
    <html lang={locale} className={`h-full ${archivo.variable} ${publicSans.variable}`}>
      <body className="min-h-full flex flex-col bg-surface text-ink antialiased font-sans">
        <LocaleProvider locale={locale}>
          <CategoriesProvider categories={categories}>
            {children}
            <GlobalFooter tf={t.common.footer} />
          </CategoriesProvider>
        </LocaleProvider>
        <SwRegister />
      </body>
    </html>
  );
}
