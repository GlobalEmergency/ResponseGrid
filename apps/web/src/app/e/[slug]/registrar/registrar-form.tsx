'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActionState } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';

const INITIAL_STATE: ActionState = { status: 'idle' };

const RESOURCE_TYPES = [
  { value: 'collection_point', label: 'Punto de recogida' },
  { value: 'delivery_point', label: 'Punto de entrega' },
  { value: 'collection_and_delivery', label: 'Recogida y entrega' },
  { value: 'warehouse', label: 'Almacén' },
  { value: 'transport', label: 'Transporte' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'venue', label: 'Local / Espacio' },
] as const;

const STAGES = [
  { value: 'origin', label: 'Origen' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'destination', label: 'Destino' },
] as const;

type BoundAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface RegistrarFormProps {
  action: BoundAction;
  slug: string;
  locationPicker: ReactNode;
  orgSelector: ReactNode;
}

export function RegistrarForm({ action, slug, locationPicker, orgSelector }: RegistrarFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    INITIAL_STATE,
  );

  // Controlled field state — values survive the re-render triggered by a
  // validation error returned from the server action (useActionState replaces
  // the state object, which re-renders the component, but React preserves
  // useState hooks across re-renders of the same component instance).
  const [type, setType] = useState('');
  const [stage, setStage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (state.status === 'success') {
    return (
      <section
        role="alert"
        aria-live="polite"
        className="flex flex-col gap-6 rounded-lg border-2 border-gray-900 bg-white p-6"
      >
        <p className="text-lg font-semibold text-gray-900 leading-snug">
          Gracias, quedas registrado. No recibas material ni publiques nada hasta
          que te validemos.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/registrar`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            onClick={() => {
              window.location.href = `/e/${slug}/registrar`;
            }}
          >
            Registrar otro recurso
          </Link>
          <Link
            href={`/e/${slug}`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
          >
            Volver a la emergencia
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error al registrar el recurso'} />
      )}

      {/* Tipo de recurso */}
      <FormField
        htmlFor="type"
        label={<>Tipo de recurso <span aria-hidden="true">*</span></>}
      >
        <Select
          id="type"
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="" disabled>
            Selecciona un tipo…
          </option>
          {RESOURCE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Etapa */}
      <FormField
        htmlFor="stage"
        label={<>Etapa <span aria-hidden="true">*</span></>}
      >
        <Select
          id="stage"
          name="stage"
          required
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="" disabled>
            Selecciona una etapa…
          </option>
          {STAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Nombre */}
      <FormField
        htmlFor="name"
        label={<>Nombre <span aria-hidden="true">*</span></>}
      >
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Cruz Roja Madrid"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      {/* Descripción */}
      <FormField
        htmlFor="description"
        label={
          <>
            Descripción{' '}
            <span className="text-gray-400 font-normal normal-case">(opcional)</span>
          </>
        }
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Información adicional sobre el recurso…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      {/* Ubicación */}
      <FormField
        htmlFor="location-search"
        label={<>Ubicación <span aria-hidden="true">*</span></>}
        labelAs="p"
      >
        {locationPicker}
      </FormField>

      {/* Organización */}
      {orgSelector}

      {/* Submit */}
      <Button type="submit" disabled={pending} fullWidth>
        {pending ? 'Enviando…' : 'Registrar recurso'}
      </Button>
    </form>
  );
}
