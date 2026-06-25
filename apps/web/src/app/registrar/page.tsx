import type { Metadata } from 'next';
import { RegistrarForm } from './registrar-form';
import { registerResource } from './actions';

export const metadata: Metadata = {
  title: 'Ofrecer un recurso — ReliefHub',
  description: 'Regístrate como recurso disponible para la emergencia.',
};

export default function RegistrarPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Ofrecer un recurso
          </h1>
          <p className="text-base text-gray-600">
            Rellena el formulario. Te validaremos antes de activarte.
          </p>
        </header>

        <RegistrarForm action={registerResource} />
      </div>
    </main>
  );
}
