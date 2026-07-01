import type { Metadata } from 'next';
import { OnboardingForm } from './onboarding-form';
import { AppBar } from '@/components/organisms/app-bar';
import { Card } from '@/components/atoms/card';
import { requireSession } from '@/lib/auth';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.onboarding.meta_title };
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const next = typeof resolved.next === 'string' ? resolved.next : '/dashboard';
  // Onboarding requires an authenticated (but incomplete) session.
  await requireSession(next);
  const { t } = await getT();

  return (
    <main className="flex-1 bg-surface">
      <AppBar variant="content" />

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-navy lg:text-[28px]">
              {t.onboarding.title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              {t.onboarding.subtitle}
            </p>
          </div>

          <Card className="p-5 lg:p-7">
            <OnboardingForm next={next} t={t.onboarding} tc={t.consent} />
          </Card>
        </div>
      </div>
    </main>
  );
}
