'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ActionState } from './actions';

const INITIAL_STATE: ActionState = { status: 'idle' };

const RESOURCE_TYPES = [
  { value: 'collection_point', label: 'Punto de recogida' },
  { value: 'delivery_point', label: 'Punto de entrega' },
  { value: 'warehouse', label: 'Almacén' },
  { value: 'transport', label: 'Transporte' },
  { value: 'supplier', label: 'Proveedor' },
  { value: 'venue', label: 'Local / Espacio' },
] as const;

const SIDES = [
  { value: 'origin', label: 'Origen (España)' },
  { value: 'destination', label: 'Destino' },
] as const;

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

interface RegistrarFormProps {
  action: Action;
}

export function RegistrarForm({ action }: RegistrarFormProps) {
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
            href="/registrar"
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
            onClick={() => {
              // Reload forces useActionState back to INITIAL_STATE
              window.location.href = '/registrar';
            }}
          >
            Registrar otro recurso
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center w-full py-4 px-6 text-base font-semibold text-gray-900 bg-white border-2 border-gray-900 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
          >
            Volver al inicio
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
          Tipo de recurso
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

      {/* Lado */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="side"
          className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
        >
          Lado
        </label>
        <select
          id="side"
          name="side"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>
            Selecciona un lado…
          </option>
          {SIDES.map(({ value, label }) => (
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
          Nombre
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
