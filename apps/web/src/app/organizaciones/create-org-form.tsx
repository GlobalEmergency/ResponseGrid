'use client';

import { useActionState } from 'react';
import { createOrganizationAction, type OrgActionResult } from './actions';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';

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
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border-2 border-line p-6">
      {state.status === 'error' && (
        <ErrorMessage message={state.message ?? 'Error al crear la organización'} />
      )}

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-name" className="text-sm font-semibold text-ink">
          Nombre <span aria-hidden="true">*</span>
        </label>
        <Input
          id="org-name"
          name="name"
          type="text"
          required
          placeholder="Cruz Roja España"
        />
      </div>

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-type" className="text-sm font-semibold text-ink">
          Tipo <span aria-hidden="true">*</span>
        </label>
        <Select id="org-type" name="type" required defaultValue="">
          <option value="" disabled>Selecciona un tipo…</option>
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      {/* Tax ID */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-taxid" className="text-sm font-semibold text-ink">
          NIF / CIF
          <span className="ml-1 text-xs font-normal text-muted">(opcional)</span>
        </label>
        <Input
          id="org-taxid"
          name="taxId"
          type="text"
          placeholder="ES-12345678"
        />
      </div>

      {/* Contact email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-email" className="text-sm font-semibold text-ink">
          Email de contacto
          <span className="ml-1 text-xs font-normal text-muted">(opcional)</span>
        </label>
        <Input
          id="org-email"
          name="contactEmail"
          type="email"
          placeholder="contacto@org.es"
        />
      </div>

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? 'Creando…' : 'Crear organización'}
      </Button>
    </form>
  );
}
