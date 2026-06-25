'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { PeticionState } from './actions';

const INITIAL_STATE: PeticionState = { status: 'idle' };

const CATEGORIES = [
  { value: 'hygiene', label: 'Higiene' },
  { value: 'water', label: 'Agua' },
  { value: 'food', label: 'Alimentos' },
  { value: 'medical', label: 'Sanitario' },
  { value: 'shelter', label: 'Refugio' },
  { value: 'tools', label: 'Herramientas' },
  { value: 'other', label: 'Otro' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
] as const;

type BoundAction = (prev: PeticionState, formData: FormData) => Promise<PeticionState>;

interface PeticionFormProps {
  action: BoundAction;
  slug: string;
}

export function PeticionForm({ action, slug }: PeticionFormProps) {
  const [state, formAction, pending] = useActionState<PeticionState, FormData>(
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
          Gracias, tu petición se ha registrado y será revisada por el equipo de
          coordinación.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/e/${slug}/peticion`}
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            onClick={() => {
              window.location.href = `/e/${slug}/peticion`;
            }}
          >
            Enviar otra petición
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

      {/* Título */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="title"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Título <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={2}
          placeholder="Ej. Mantas térmicas para familias"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="category"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Categoría <span aria-hidden="true">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>
            Selecciona una categoría…
          </option>
          {CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Prioridad */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="priority"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Prioridad <span aria-hidden="true">*</span>
        </label>
        <select
          id="priority"
          name="priority"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>
            Selecciona una prioridad…
          </option>
          {PRIORITIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Cantidad (opcional) */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="quantity"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Cantidad <span className="text-gray-400 font-normal normal-case">(opcional)</span>
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          step={1}
          placeholder="Ej. 50"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Unidad (opcional) */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="unit"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Unidad <span className="text-gray-400 font-normal normal-case">(opcional)</span>
        </label>
        <input
          id="unit"
          name="unit"
          type="text"
          placeholder="Ej. cajas, litros, unidades"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center w-full py-4 px-6 text-lg font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Enviando…' : 'Enviar petición'}
      </button>
    </form>
  );
}
