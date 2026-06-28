'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction, type SignupResult } from '@/app/signup/actions';
import { SocialLoginButtons } from '@/components/social-login-buttons';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: SignupResult = { status: 'idle' };

interface SignupFormProps {
  next: string;
  t: Messages['signup'];
}

export function SignupForm({ next, t }: SignupFormProps) {
  const boundAction = signupAction.bind(null, next);
  const [state, formAction, pending] = useActionState<SignupResult, FormData>(
    boundAction,
    INITIAL_STATE,
  );

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5">
        {state.status === 'error' && (
          <ErrorMessage message={state.message ?? t.error_fallback} />
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t.name_label}</Label>
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
          <Label htmlFor="email">{t.email_label}</Label>
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
            {t.password_label}{' '}
            <span className="font-normal text-muted">{t.password_hint}</span>
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
          {pending ? t.submitting : t.submit}
        </Button>
      </form>

      <SocialLoginButtons />

      <p className="text-center text-sm text-muted">
        {t.already_account}{' '}
        <Link
          href="/login"
          className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft"
        >
          {t.login_link}
        </Link>
      </p>
    </div>
  );
}
