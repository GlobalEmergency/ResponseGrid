'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type LoginResult } from './actions';
import { SocialLoginButtons } from '@/components/social-login-buttons';

const INITIAL_STATE: LoginResult = { status: 'idle' };

interface LoginFormProps {
  next: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const boundAction = loginAction.bind(null, next);
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex flex-col gap-5">
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

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-gray-900"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="coord@reliefhub.org"
            className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-gray-900"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
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
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Social login */}
      <SocialLoginButtons />

      {/* Link to signup */}
      <p className="text-center text-sm text-gray-600">
        ¿No tienes cuenta?{' '}
        <Link
          href="/signup"
          className="font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-700"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
