'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type LoginResult } from '@/app/login/actions';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: LoginResult = { status: 'idle' };

interface LoginFormProps {
  next: string;
  t: Messages['login'];
}

export function LoginForm({ next, t }: LoginFormProps) {
  const boundAction = loginAction.bind(null, next);
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {state.status === 'error' && (
          <ErrorMessage message={state.message ?? t.error_fallback} />
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t.email_label}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="email@example.com"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t.password_label}</Label>
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
          {pending ? t.submitting : t.submit}
        </Button>
      </form>

      <SocialLoginButtons />

      <p className="text-center text-sm text-muted">
        {t.no_account}{' '}
        <Link
          href="/signup"
          className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft"
        >
          {t.create_account}
        </Link>
      </p>
    </div>
  );
}
