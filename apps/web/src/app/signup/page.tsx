import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = {
  title: 'Crear cuenta — ReliefHub',
  description: 'Regístrate en ReliefHub para coordinar emergencias.',
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const next = typeof resolved.next === 'string' ? resolved.next : '/';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Crear cuenta
          </h1>
          <p className="text-base text-gray-600">
            Únete a ReliefHub para coordinar recursos en emergencias.
          </p>
        </header>

        {/* Signup form */}
        <SignupForm next={next} />
      </div>
    </main>
  );
}
