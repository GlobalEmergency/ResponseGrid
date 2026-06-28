import type { Metadata } from 'next';
import { LoginForm } from '@/components/organisms/login-form';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t.login.meta_title,
    description: t.login.meta_description,
  };
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const next =
    typeof resolved.next === 'string' ? resolved.next : '/';
  const { t } = await getT();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.login.title}
          </h1>
          <p className="text-base text-gray-600">
            {t.login.subtitle}
          </p>
        </header>

        {/* Demo credentials note — opt-in via DEMO_MODE=true; hidden by default
            so real production deployments never expose demo credentials. */}
        {process.env.DEMO_MODE === 'true' && (
          <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t.login.demo_label}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t.login.demo_email_label}</span> {t.login.demo_email}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t.login.demo_password_label}</span> {t.login.demo_password}
            </p>
          </div>
        )}

        {/* Login form */}
        <LoginForm next={next} t={t.login} />
      </div>
    </main>
  );
}
