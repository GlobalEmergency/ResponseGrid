'use client';

import { useActionState } from 'react';
import { updateProfileAction, type ProfileActionResult } from './actions';
import { Input } from '@/components/atoms/input';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL: ProfileActionResult = { status: 'idle' };

interface ProfileFormProps {
  initialName: string;
  initialPhone: string | null;
}

export function ProfileForm({ initialName, initialPhone }: ProfileFormProps) {
  const m = getMessages(useLocale());
  const tm = m.miPerfil;

  const [state, formAction, pending] = useActionState(updateProfileAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'success' && (
        <p className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {tm.success}
        </p>
      )}
      {state.status === 'error' && (
        <p className="rounded-lg border-2 border-danger bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
          {tm.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold text-ink">
          {tm.label_name}
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          defaultValue={initialName}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-semibold text-ink">
          {tm.label_phone}
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialPhone ?? ''}
          placeholder="+34 600 000 000"
        />
        <p className="text-xs text-muted">{tm.phone_hint}</p>
      </div>

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? tm.btn_saving : tm.btn_save}
      </Button>
    </form>
  );
}
