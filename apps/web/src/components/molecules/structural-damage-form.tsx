'use client';

import { FormField } from '@/components/molecules/form-field';
import { Select } from '@/components/atoms/select';
import { Input } from '@/components/atoms/input';

/**
 * StructuralDamageForm — sub-form that expands inside /reportar when
 * type is 'structural_damage' or 'trapped_persons'.
 *
 * All fields are rendered as controlled/uncontrolled native inputs with
 * `name` attributes so FormData picks them up in the server action.
 * The parent form wraps this; no nested <form>.
 */
export function StructuralDamageForm() {
  return (
    <div className="flex flex-col gap-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
      <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">
        Detalles estructurales (SAR)
      </p>

      {/* Nivel de daño — requerido */}
      <FormField
        htmlFor="damageLevel"
        label={
          <>
            Nivel de daño <span aria-hidden="true">*</span>
          </>
        }
      >
        <Select id="damageLevel" name="damageLevel" required defaultValue="">
          <option value="" disabled>
            Selecciona el nivel…
          </option>
          <option value="collapsed">🔴 Colapsada — edificación derrumbada</option>
          <option value="severe">🟠 Daño grave — estructura muy comprometida</option>
          <option value="moderate">🟡 Daño moderado — daños visibles pero habitable</option>
        </Select>
      </FormField>

      {/* Personas atrapadas estimadas — opcional */}
      <FormField
        htmlFor="trappedPersonsEstimate"
        label="Personas atrapadas estimadas (opcional)"
      >
        <Input
          id="trappedPersonsEstimate"
          name="trappedPersonsEstimate"
          type="number"
          min="0"
          step="1"
          placeholder="0 = ninguna / desconocido"
        />
      </FormField>

      {/* Acceso para equipos SAR — opcional */}
      <div className="flex items-center gap-3">
        <input
          id="accessibleForRescue"
          name="accessibleForRescue"
          type="checkbox"
          value="true"
          className="h-5 w-5 rounded border-2 border-gray-900 text-gray-900 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 accent-gray-900"
        />
        <label
          htmlFor="accessibleForRescue"
          className="text-sm font-semibold text-gray-900"
        >
          Acceso despejado para equipos de rescate
        </label>
      </div>

      {/* Tipo de edificio — opcional */}
      <FormField
        htmlFor="buildingType"
        label="Tipo de edificio (opcional)"
      >
        <Input
          id="buildingType"
          name="buildingType"
          type="text"
          placeholder="Ej. vivienda, escuela, hospital, comercio…"
        />
      </FormField>

      <p className="text-xs text-red-700">
        Si hay personas atrapadas, la prioridad se elevará a <strong>urgente</strong> automáticamente.
      </p>
    </div>
  );
}
