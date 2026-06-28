'use client';

import { useActionState, useRef } from 'react';
import { createTask } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/voluntarios/actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { FormField } from '@/components/molecules/form-field';
import { ErrorMessage } from '@/components/atoms/error-message';

const SKILL_OPTIONS = [
  { value: '', label: 'Sin habilidad requerida' },
  { value: 'driving', label: 'Conducción' },
  { value: 'medical', label: 'Sanitario' },
  { value: 'logistics', label: 'Logística' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'languages', label: 'Idiomas' },
  { value: 'admin', label: 'Administración' },
  { value: 'general', label: 'General' },
] as const;

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CreateTaskFormProps {
  emergencyId: string;
  slug: string;
}

export function CreateTaskForm({ emergencyId, slug }: CreateTaskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

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
      aria-label="Crear nueva tarea"
    >
      <h3 className="text-base font-bold text-ink">Nueva tarea</h3>

      {state.status === 'success' && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-500 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          Tarea creada correctamente.
        </p>
      )}

      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <FormField htmlFor="task-title" label="Título">
        <Input
          id="task-title"
          name="title"
          type="text"
          placeholder="Ej. Distribuir agua en zona 3"
          required
          maxLength={200}
        />
      </FormField>

      <FormField htmlFor="task-description" label="Descripción">
        <Textarea
          id="task-description"
          name="description"
          placeholder="Describe la tarea con detalle…"
          rows={3}
          required
          maxLength={1000}
        />
      </FormField>

      <FormField htmlFor="task-skill" label="Habilidad requerida (opcional)">
        <select
          id="task-skill"
          name="requiredSkill"
          defaultValue=""
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {SKILL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Optional location */}
      <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-4">
        <legend className="px-1 text-xs font-semibold text-ink-soft uppercase tracking-wide">
          Ubicación (opcional)
        </legend>

        <FormField htmlFor="task-address" label="Dirección">
          <Input
            id="task-address"
            name="address"
            type="text"
            placeholder="Calle Mayor 1, Valencia"
            maxLength={300}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField htmlFor="task-latitude" label="Latitud">
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
          <FormField htmlFor="task-longitude" label="Longitud">
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
        {pending ? 'Creando tarea…' : 'Crear tarea'}
      </Button>
    </form>
  );
}
