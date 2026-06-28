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

const INITIAL_STATE: CreateFromTemplateResult = { status: 'idle' };

interface CreateFromTemplateFormProps {
  templates: TemplateViewDto[];
}

export function CreateFromTemplateForm({ templates }: CreateFromTemplateFormProps) {
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
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Emergencia creada. Redirigiendo…
        </p>
      )}

      <FormField htmlFor="templateId" label="Plantilla">
        <Select id="templateId" name="templateId" required defaultValue="">
          <option value="" disabled>
            Selecciona una plantilla
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="name" label="Nombre de la emergencia">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Ej: Terremoto Valencia 2026"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="slug" label="Slug (URL)">
        <Input
          id="slug"
          name="slug"
          type="text"
          placeholder="Ej: terremoto-valencia-2026"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Solo letras minúsculas, números y guiones"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="country" label="Código de país (ISO 3166-1 alpha-2)">
        <Input
          id="country"
          name="country"
          type="text"
          placeholder="Ej: ES"
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
        {pending ? 'Creando emergencia…' : 'Crear emergencia desde plantilla'}
      </Button>

      {templates.length === 0 && (
        <p className="text-xs text-muted">
          Crea al menos una plantilla antes de usarla aquí.
        </p>
      )}
    </form>
  );
}
