import type { Metadata } from 'next';
import { SignupForm } from '@/components/organisms/signup-form';
import { AppBar } from '@/components/organisms/app-bar';
import { Card } from '@/components/atoms/card';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.signup.meta_title,
    description: t.signup.meta_description,
  };
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const next = typeof resolved.next === 'string' ? resolved.next : '/dashboard';
  const { t } = await getT();

  return (
    <main className="flex-1 bg-surface">
      <AppBar variant="content" />

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-navy lg:text-[28px]">
              {t.signup.title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">{t.signup.subtitle}</p>
          </div>

          <Card className="p-5 lg:p-7">
            <SignupForm next={next} t={t.signup} />
          </Card>
        </div>
      </div>
    </main>
  );
}
