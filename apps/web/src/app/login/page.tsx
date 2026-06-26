import type { Metadata } from 'next';
import { LoginForm } from '@/components/organisms/login-form';

export const metadata: Metadata = {
  title: 'Acceso coordinación — ReliefHub',
  description: 'Panel de coordinación de emergencias.',
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const next =
    typeof resolved.next === 'string' ? resolved.next : '/';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Acceso de coordinación
          </h1>
          <p className="text-base text-gray-600">
            Introduce tus credenciales para entrar al panel.
          </p>
        </header>

        {/* Demo credentials note */}
        <div className="rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Credenciales demo
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Email:</span> coord@reliefhub.org
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Contraseña:</span> coord1234
          </p>
        </div>

        {/* Login form */}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
