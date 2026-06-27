'use client';

import { useActionState } from 'react';
import { createTemplateAction } from './actions';
import type { TemplateActionResult } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const INITIAL_STATE: TemplateActionResult = { status: 'idle' };

export function CreateTemplateForm() {
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
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          {state.message}
        </p>
      )}

      <FormField htmlFor="name" label="Nombre de la plantilla">
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Ej: Terremoto básico"
          required
          autoComplete="off"
        />
      </FormField>

      <FormField htmlFor="description" label="Descripción">
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Describe cuándo usar esta plantilla"
          required
        />
      </FormField>

      <FormField
        htmlFor="dontBringList"
        label="Qué NO llevar (una línea por ítem)"
      >
        <Textarea
          id="dontBringList"
          name="dontBringList"
          rows={5}
          placeholder={'Ropa usada sin clasificar\nMedicamentos sin validación\nAlimentos caseros'}
          required
        />
      </FormField>

      <FormField
        htmlFor="defaultAnnouncement"
        label="Comunicado por defecto (opcional)"
      >
        <Textarea
          id="defaultAnnouncement"
          name="defaultAnnouncement"
          rows={3}
          placeholder="Texto que aparecerá como comunicado inicial de la emergencia"
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? 'Creando…' : 'Crear plantilla'}
      </Button>
    </form>
  );
}
