'use client';

import { categoryLabel } from '@/lib/categories';

export interface SupplyLineRowValue {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiresAt?: string;
}

/** Per-row label strings (built from each form's i18n; same keys everywhere). */
export interface SupplyLineRowLabels {
  /** "Artículo {n}" — `{n}` is replaced with the 1-based index. */
  itemNumber: string;
  /** aria-label for the remove button — `{n}` replaced with the index. */
  itemRemove: string;
  itemRemoveLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  quantityLabel: string;
  unitLabel: string;
  unitOpt: string;
  unitPlaceholder: string;
  categoryLabel: string;
  expiryLabel?: string;
  expiryOpt?: string;
}

interface SupplyLineRowFieldsProps {
  /** Stable row id (for input ids); index is the 1-based display number. */
  rowId: string | number;
  index: number;
  idPrefix: string;
  required: boolean;
  removable: boolean;
  categories: readonly string[];
  locale: 'es' | 'en';
  labels: SupplyLineRowLabels;
  value: SupplyLineRowValue;
  onChange: (patch: Partial<SupplyLineRowValue>) => void;
  onRemove: () => void;
}

/**
 * One editable supply line (name + quantity + unit + category) — the shared row
 * markup behind the petición items field (needs) and the registrar inventory
 * field (resource inventory). The surrounding wrapper (header, empty state,
 * required vs optional semantics, serialization, personnel fields) stays with
 * each form, where those genuinely differ.
 */
export function SupplyLineRowFields({
  rowId,
  index,
  idPrefix,
  required,
  removable,
  categories,
  locale,
  labels,
  value,
  onChange,
  onRemove,
}: SupplyLineRowFieldsProps) {
  const n = String(index + 1);

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">
          {labels.itemNumber.replace('{n}', n)}
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={labels.itemRemove.replace('{n}', n)}
            className="text-sm text-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 rounded"
          >
            {labels.itemRemoveLabel}
          </button>
        )}
      </div>

      {/* Nombre del insumo */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-name-${rowId}`}
          className="text-sm font-medium text-ink-soft"
        >
          {labels.nameLabel} <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name-${rowId}`}
          type="text"
          required={required}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={labels.namePlaceholder}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Cantidad */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-qty-${rowId}`}
            className="text-sm font-medium text-ink-soft"
          >
            {labels.quantityLabel} <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${idPrefix}-qty-${rowId}`}
            type="number"
            min={1}
            step={1}
            required={required}
            value={value.quantity}
            onChange={(e) =>
              onChange({
                quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
              })
            }
            className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          />
        </div>

        {/* Unidad */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-unit-${rowId}`}
            className="text-sm font-medium text-ink-soft"
          >
            {labels.unitLabel}{' '}
            <span className="text-muted-soft font-normal">{labels.unitOpt}</span>
          </label>
          <input
            id={`${idPrefix}-unit-${rowId}`}
            type="text"
            value={value.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            placeholder={labels.unitPlaceholder}
            className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          />
        </div>
      </div>

      {labels.expiryLabel != null && labels.expiryOpt != null && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-exp-${rowId}`}
            className="text-sm font-medium text-ink-soft"
          >
            {labels.expiryLabel}{' '}
            <span className="text-muted-soft font-normal">
              {labels.expiryOpt}
            </span>
          </label>
          <input
            id={`${idPrefix}-exp-${rowId}`}
            type="date"
            value={value.expiresAt ?? ''}
            onChange={(e) => onChange({ expiresAt: e.target.value })}
            className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          />
        </div>
      )}

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-cat-${rowId}`}
          className="text-sm font-medium text-ink-soft"
        >
          {labels.categoryLabel} <span aria-hidden="true">*</span>
        </label>
        <select
          id={`${idPrefix}-cat-${rowId}`}
          required={required}
          value={value.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
        >
          {categories.map((slug) => (
            <option key={slug} value={slug}>
              {categoryLabel(slug, locale)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
