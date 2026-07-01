'use client';

import { useActionState } from 'react';
import { onboardingAction, type OnboardingResult } from './actions';
import { ConsentLabel } from '@/components/molecules/consent-label';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Button } from '@/components/atoms/button';
import { ConsentCheckbox } from '@/components/atoms/consent-checkbox';
import { ErrorMessage } from '@/components/atoms/error-message';
import type { Messages } from '@/i18n/messages/es';

const INITIAL_STATE: OnboardingResult = { status: 'idle' };

interface OnboardingFormProps {
  next: string;
  t: Messages['onboarding'];
  tc: Messages['consent'];
}

export function OnboardingForm({ next, t, tc }: OnboardingFormProps) {
  const boundAction = onboardingAction.bind(null, next);
  const [state, formAction, pending] = useActionState<
    OnboardingResult,
    FormData
  >(boundAction, INITIAL_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? t.error_fallback} />
      )}

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

      <ConsentCheckbox
        id="consent"
        name="consent"
        label={<ConsentLabel t={tc} />}
      />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
