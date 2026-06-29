import type { Metadata } from 'next';
import { LoginForm } from '@/components/organisms/login-form';
import { PageHeaderBand } from '@/components/molecules/page-header-band';
import { Card } from '@/components/atoms/card';
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
    <main className="flex-1 bg-surface">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeaderBand title={t.login.title} subtitle={t.login.subtitle} />
        <div className="flex flex-col gap-8 px-5 pb-12 pt-6 lg:px-8">
          <Card className="flex flex-col gap-8 p-5 lg:p-7">
            {/* Demo credentials note — opt-in via DEMO_MODE=true; hidden by default
                so real production deployments never expose demo credentials. */}
            {process.env.DEMO_MODE === 'true' && (
              <div className="rounded-lg border-2 border-line bg-surface px-4 py-3 flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.login.demo_label}
                </p>
                <p className="text-sm text-ink-soft">
                  <span className="font-medium">{t.login.demo_email_label}</span> {t.login.demo_email}
                </p>
                <p className="text-sm text-ink-soft">
                  <span className="font-medium">{t.login.demo_password_label}</span> {t.login.demo_password}
                </p>
              </div>
            )}

            {/* Login form */}
            <LoginForm next={next} t={t.login} />
          </Card>
        </div>
      </div>
    </main>
  );
}
