'use client';

import { useActionState } from 'react';
import { createTemplateAction } from './actions';
import type { TemplateActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL_STATE: TemplateActionResult = { status: 'idle' };

export function CreateTemplateForm() {
  const t = getMessages(useLocale()).templates;
  const [state, formAction, pending] = useActionState(
    createTemplateAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      {state.status === 'success' && state.message != null && (
        <p
          role="status"
          className="rounded-md border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {state.message}
        </p>
      )}

      <FormField htmlFor="name" label={t.f_name_label}>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={t.f_name_ph}
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="description" label={t.f_description_label}>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t.f_description_ph}
          required
        />
      </FormField>

      <FormField
        htmlFor="dontBringList"
        label={t.f_dont_bring_label}
      >
        <Textarea
          id="dontBringList"
          name="dontBringList"
          rows={5}
          placeholder={t.f_dont_bring_ph}
          required
        />
      </FormField>

      <FormField
        htmlFor="defaultAnnouncement"
        label={t.f_announcement_label}
      >
        <Textarea
          id="defaultAnnouncement"
          name="defaultAnnouncement"
          rows={3}
          placeholder={t.f_announcement_ph}
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? t.f_submitting : t.f_submit}
      </Button>
    </form>
  );
}
