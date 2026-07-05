'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signupAction, type SignupResult } from '@/app/signup/actions';
import { SocialLoginButtons } from '@/components/molecules/social-login-buttons';
import { ConsentLabel } from '@/components/molecules/consent-label';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ConsentCheckbox } from '@/components/atoms/consent-checkbox';
import { ErrorMessage } from '@/components/atoms/error-message';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: SignupResult = { status: 'idle' };

interface SignupFormProps {
  next: string;
  t: Messages['signup'];
  tc: Messages['consent'];
}

export function SignupForm({ next, t, tc }: SignupFormProps) {
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            {t.phone_label}{' '}
            <span className="font-normal text-muted">{t.phone_hint}</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="+58 412 555 0101"
          />
        </div>

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

        <ConsentCheckbox
          id="consent"
          name="consent"
          label={<ConsentLabel t={tc} />}
        />

        <Button type="submit" disabled={pending} fullWidth>
          {pending ? t.submitting : t.submit}
        </Button>
      </form>

      <SocialLoginButtons next={next} />

      <p className="text-center text-sm text-muted">
        {t.already_account}{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-ink underline underline-offset-2 hover:text-ink-soft"
        >
          {t.login_link}
        </Link>
      </p>
    </div>
  );
}
