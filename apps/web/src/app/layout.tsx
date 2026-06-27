import type { Metadata } from 'next';
import './globals.css';
import { SwRegister } from '@/components/atoms/sw-register';
import { getT } from '@/i18n/server';
import { LocaleProvider } from '@/i18n/locale-context';

export const metadata: Metadata = {
  title: 'ReliefHub',
  description: 'Coordinación de recursos en emergencias',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getT();

  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        <LocaleProvider locale={locale}>
          {children}
        </LocaleProvider>
        <SwRegister />
      </body>
    </html>
  );
}
