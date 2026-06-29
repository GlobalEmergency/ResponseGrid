import type { Metadata } from 'next';
import { SignupForm } from '@/components/organisms/signup-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
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
  const next = typeof resolved.next === 'string' ? resolved.next : '/';
  const { t } = await getT();

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand title={t.signup.title} subtitle={t.signup.subtitle} />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="p-5 lg:p-7">
            {/* Signup form */}
            <SignupForm next={next} t={t.signup} />
          </Card>
        </div>
      </div>
    </main>
  );
}
