'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActionState } from './actions';

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
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
      )}

      {/* Tipo de recurso */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="type"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Tipo de recurso <span aria-hidden="true">*</span>
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>
            Selecciona un tipo…
          </option>
          {RESOURCE_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Etapa */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="stage"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Etapa <span aria-hidden="true">*</span>
        </label>
        <select
          id="stage"
          name="stage"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>
            Selecciona una etapa…
          </option>
          {STAGES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Nombre */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="name"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Nombre <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Cruz Roja Madrid"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="description"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Descripción{' '}
          <span className="text-gray-400 font-normal normal-case">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Información adicional sobre el recurso…"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 resize-none"
        />
      </div>

      {/* Ubicación */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Ubicación <span aria-hidden="true">*</span>
        </p>
        {locationPicker}
      </div>

      {/* Organización */}
      {orgSelector}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Enviando…' : 'Registrar recurso'}
      </button>
    </form>
  );
}
