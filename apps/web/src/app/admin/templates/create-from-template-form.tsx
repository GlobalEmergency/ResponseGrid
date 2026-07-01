'use client';

import { useActionState } from 'react';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createFromTemplateAction } from './actions';
import type { CreateFromTemplateResult, TemplateViewDto } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const INITIAL_STATE: CreateFromTemplateResult = { status: 'idle' };

interface CreateFromTemplateFormProps {
  templates: TemplateViewDto[];
}

export function CreateFromTemplateForm({ templates }: CreateFromTemplateFormProps) {
  const t = getMessages(useLocale()).templates;
  const [state, formAction, pending] = useActionState(
    createFromTemplateAction,
    INITIAL_STATE,
  );

  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (state.status === 'success' && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push(`/e/${state.slug}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-md border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {t.cf_success}
        </p>
      )}

      <FormField htmlFor="templateId" label={t.cf_template_label}>
        <Select id="templateId" name="templateId" required defaultValue="">
          <option value="" disabled>
            {t.cf_template_ph}
          </option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="name" label={t.cf_name_label}>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={t.cf_name_ph}
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="slug" label={t.cf_slug_label}>
        <Input
          id="slug"
          name="slug"
          type="text"
          placeholder={t.cf_slug_ph}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title={t.cf_slug_title}
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="country" label={t.cf_country_label}>
        <Input
          id="country"
          name="country"
          type="text"
          placeholder={t.cf_country_ph}
          maxLength={2}
          required
          autoComplete="off"
          className="uppercase"
        />
      </FormField>

      <Button
        type="submit"
        disabled={pending || templates.length === 0}
        size="md"
      >
        {pending ? t.cf_submitting : t.cf_submit}
      </Button>

      {templates.length === 0 && (
        <p className="text-xs text-muted">
          {t.cf_no_templates}
        </p>
      )}
    </form>
  );
}
