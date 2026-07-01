'use client';

import { getMessages, type Locale } from '@/i18n';
import type { Messages } from '@/i18n/messages/es';
import { SupplySelector } from '@/components/molecules/supply-selector';
import { useSupplyLine } from '@/hooks/use-supply-line';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';

interface SupplyLineFieldsProps {
  idPrefix: string;
  rowId: string | number;
  index: number;
  required: boolean;
  removable: boolean;
  categories: readonly Category[];
  locale: Locale;
  value: SupplyLine;
  onChange: (patch: Partial<SupplyLine>) => void;
  onRemove: () => void;
  labels?: Partial<Messages['supplyLine']>;
  showExpiry?: boolean;
}

export function SupplyLineFields({
  idPrefix, rowId, index, required, removable, categories, locale,
  value, onChange, onRemove, labels, showExpiry = false,
}: SupplyLineFieldsProps) {
  const t = { ...getMessages(locale).supplyLine, ...labels };
  const n = String(index + 1);
  const { showCategory, showUnit, showExpiry: modeExpiry, selector } = useSupplyLine({
    value, categories, onChange,
  });

  const fieldClass =
    'w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2';

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">
          {t.itemNumber.replace('{n}', n)}
        </span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.itemRemove.replace('{n}', n)}
            className="text-sm text-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 rounded"
          >
            {t.itemRemoveLabel}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-name-${rowId}`} className="text-sm font-medium text-ink-soft">
          {t.nameLabel} <span aria-hidden="true">*</span>
        </label>
        <SupplySelector
          id={`${idPrefix}-name-${rowId}`}
          locale={locale}
          placeholder={t.namePlaceholder}
          required={required}
          name={selector.name}
          supplyId={selector.supplyId}
          onTextChange={selector.onTextChange}
          onSelect={selector.onSelect}
          onBlur={selector.onBlur}
          labels={{ searching: t.searching, noMatches: t.noMatches, error: t.error, hint: t.otherHint }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-qty-${rowId}`} className="text-sm font-medium text-ink-soft">
            {t.quantityLabel} <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${idPrefix}-qty-${rowId}`}
            type="number" min={1} step={1} required={required}
            value={value.quantity}
            onChange={(e) => onChange({ quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
            className={fieldClass}
          />
        </div>

        {showUnit && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${idPrefix}-unit-${rowId}`} className="text-sm font-medium text-ink-soft">
              {t.unitLabel} <span className="text-muted-soft font-normal">{t.unitOpt}</span>
            </label>
            <input
              id={`${idPrefix}-unit-${rowId}`}
              type="text"
              value={value.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder={t.unitPlaceholder}
              className={fieldClass}
            />
          </div>
        )}
      </div>

      {showExpiry && modeExpiry && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-exp-${rowId}`} className="text-sm font-medium text-ink-soft">
            {t.expiryLabel} <span className="text-muted-soft font-normal">{t.expiryOpt}</span>
          </label>
          <input
            id={`${idPrefix}-exp-${rowId}`}
            type="date"
            value={value.expiresAt ?? ''}
            onChange={(e) => onChange({ expiresAt: e.target.value })}
            className={fieldClass}
          />
        </div>
      )}

      {showCategory && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-cat-${rowId}`} className="text-sm font-medium text-ink-soft">
            {t.categoryLabel} <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${idPrefix}-cat-${rowId}`}
            required={required}
            value={value.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className={fieldClass}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
