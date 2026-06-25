'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction, type SignupResult } from './actions';

const INITIAL_STATE: SignupResult = { status: 'idle' };

interface SignupFormProps {
  next: string;
}

export function SignupForm({ next }: SignupFormProps) {
  const boundAction = signupAction.bind(null, next);
  const [state, formAction, pending] = useActionState<SignupResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Error message */}
      {state.status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold text-gray-900">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Doe"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-gray-900">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-gray-900"
        >
          Contraseña{' '}
          <span className="font-normal text-gray-500">(mín. 8 caracteres)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

      {/* Link to login */}
      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-700"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
