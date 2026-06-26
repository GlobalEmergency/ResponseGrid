'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type LoginResult } from '@/app/login/actions';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

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
        {state.status === 'error' && (
          <ErrorMessage message={state.message ?? 'Error al iniciar sesión'} />
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="coord@reliefhub.org"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" disabled={pending} fullWidth>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <SocialLoginButtons />

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
