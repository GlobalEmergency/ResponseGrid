'use client';

import { useActionState } from 'react';
import { createOrganizationAction, type OrgActionResult } from './actions';

const INITIAL_STATE: OrgActionResult = { status: 'idle' };

const ORG_TYPES = [
  { value: 'ngo', label: 'ONG' },
  { value: 'company', label: 'Empresa' },
  { value: 'public_admin', label: 'Administración pública' },
  { value: 'association', label: 'Asociación' },
  { value: 'other', label: 'Otra' },
] as const;

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState<OrgActionResult, FormData>(
    createOrganizationAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border-2 border-gray-200 p-6">
      {/* Error */}
      {state.status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-name" className="text-sm font-semibold text-gray-900">
          Nombre <span aria-hidden="true">*</span>
        </label>
        <input
          id="org-name"
          name="name"
          type="text"
          required
          placeholder="Cruz Roja España"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-type" className="text-sm font-semibold text-gray-900">
          Tipo <span aria-hidden="true">*</span>
        </label>
        <select
          id="org-type"
          name="type"
          required
          defaultValue=""
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <option value="" disabled>Selecciona un tipo…</option>
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Tax ID */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-taxid" className="text-sm font-semibold text-gray-900">
          NIF / CIF
          <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
        </label>
        <input
          id="org-taxid"
          name="taxId"
          type="text"
          placeholder="ES-12345678"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Contact email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-email" className="text-sm font-semibold text-gray-900">
          Email de contacto
          <span className="ml-1 text-xs font-normal text-gray-500">(opcional)</span>
        </label>
        <input
          id="org-email"
          name="contactEmail"
          type="email"
          placeholder="contacto@org.es"
          className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Creando…' : 'Crear organización'}
      </button>
    </form>
  );
}
