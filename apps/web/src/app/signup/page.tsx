import type { Metadata } from 'next';
import { SignupForm } from '@/components/organisms/signup-form';
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
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.signup.title}
          </h1>
          <p className="text-base text-gray-600">
            {t.signup.subtitle}
          </p>
        </header>

        {/* Signup form */}
        <SignupForm next={next} t={t.signup} />
      </div>
    </main>
  );
}
