'use client';

import { useActionState, useRef } from 'react';
import { createTask } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const SKILL_VALUES = ['', 'driving', 'medical', 'logistics', 'cooking', 'languages', 'admin', 'general'] as const;

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CreateTaskFormProps {
  emergencyId: string;
  slug: string;
}

export function CreateTaskForm({ emergencyId, slug }: CreateTaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const tc = getMessages(useLocale()).coord;

  const SKILL_LABELS: Record<(typeof SKILL_VALUES)[number], string> = {
    '': tc.task_skill_none,
    driving: tc.skill_driving,
    medical: tc.skill_medical,
    logistics: tc.skill_logistics,
    cooking: tc.skill_cooking,
    languages: tc.skill_languages,
    admin: tc.skill_admin,
    general: tc.skill_general,
  };

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const result = await createTask(emergencyId, slug, formData);
      if (result.status === 'success') {
        // Reset the form on success
        formRef.current?.reset();
      }
      return result;
    },
    INITIAL_STATE,
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border-2 border-line bg-surface p-5"
      aria-label={tc.task_form_label}
    >
      <h3 className="text-base font-bold text-ink">{tc.task_form_heading}</h3>

      {state.status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-success bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {tc.task_created}
        </p>
      )}

      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <FormField htmlFor="task-title" label={tc.task_field_title}>
        <Input
          id="task-title"
          name="title"
          type="text"
          placeholder={tc.task_title_placeholder}
          required
          maxLength={200}
        />
      </FormField>

      <FormField htmlFor="task-description" label={tc.task_field_description}>
        <Textarea
          id="task-description"
          name="description"
          placeholder={tc.task_description_placeholder}
          rows={3}
          required
          maxLength={1000}
        />
      </FormField>

      <FormField htmlFor="task-skill" label={tc.task_field_skill}>
        <select
          id="task-skill"
          name="requiredSkill"
          defaultValue=""
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {SKILL_VALUES.map((value) => (
            <option key={value} value={value}>
              {SKILL_LABELS[value]}
            </option>
          ))}
        </select>
      </FormField>

      {/* Optional location */}
      <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-xs font-semibold text-ink-soft uppercase tracking-wide">
          {tc.task_location_legend}
        </legend>

        <FormField htmlFor="task-address" label={tc.task_field_address}>
          <Input
            id="task-address"
            name="address"
            type="text"
            placeholder={tc.task_address_placeholder}
            maxLength={300}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField htmlFor="task-latitude" label={tc.task_field_latitude}>
            <Input
              id="task-latitude"
              name="latitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              placeholder="39.4699"
            />
          </FormField>
          <FormField htmlFor="task-longitude" label={tc.task_field_longitude}>
            <Input
              id="task-longitude"
              name="longitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              placeholder="-0.3763"
            />
          </FormField>
        </div>
      </fieldset>

      <Button type="submit" disabled={pending} fullWidth size="md">
        {pending ? tc.task_creating : tc.task_create}
      </Button>
    </form>
  );
}
