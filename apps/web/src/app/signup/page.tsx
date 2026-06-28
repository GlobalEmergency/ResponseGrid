import type { Metadata } from 'next';
import { SignupForm } from '@/components/organisms/signup-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
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
  const next = typeof resolved.next === 'string' ? resolved.next : '/';
  const { t } = await getT();

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-sm">
        <PageHeaderBand title={t.signup.title} subtitle={t.signup.subtitle} />
        <div className="flex flex-col gap-8 px-4 pb-12 pt-6">
          {/* Signup form */}
          <SignupForm next={next} t={t.signup} />
        </div>
      </div>
    </main>
  );
}
