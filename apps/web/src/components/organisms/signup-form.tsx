'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction, type SignupResult } from '@/app/signup/actions';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

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
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {state.status === 'error' && (
          <ErrorMessage message={state.message ?? 'Error al crear la cuenta'} />
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Jane Doe"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Contraseña{' '}
            <span className="font-normal text-gray-500">(mín. 8 caracteres)</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" disabled={pending} fullWidth>
          {pending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <SocialLoginButtons />

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-700"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
