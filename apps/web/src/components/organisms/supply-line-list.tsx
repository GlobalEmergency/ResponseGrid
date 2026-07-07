'use client';

import { getMessages, type Locale } from '@/i18n';
import type { Messages } from '@/i18n/messages/es';
import { SupplyLineFields } from '@/components/molecules/supply-line-fields';
import { emptyLine, type SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';

interface SupplyLineListProps {
  value: SupplyLine[];
  onChange: (next: SupplyLine[]) => void;
  categories: readonly Category[];
  locale: Locale;
  idPrefix: string;
  required: boolean;
  defaultCategory: string;
  showExpiry?: boolean;
  labels?: Partial<Messages['supplyLine']>;
  /** Index of the row a server-side validation error points at (#296). */
  invalidIndex?: number;
}

export function SupplyLineList({
  value, onChange, categories, locale, idPrefix, required,
  defaultCategory, showExpiry = false, labels, invalidIndex,
}: SupplyLineListProps) {
  const t = { ...getMessages(locale).supplyLine, ...labels };

  const update = (i: number, patch: Partial<SupplyLine>) =>
    onChange(value.map((line, idx) => (idx === i ? { ...line, ...patch } : line)));
  const add = () => onChange([...value, emptyLine(defaultCategory)]);
  const remove = (i: number) =>
    onChange(value.length <= 1 && required ? value : value.filter((_, idx) => idx !== i));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
        {t.legend}{required && <span aria-hidden="true"> *</span>}
      </legend>

      {value.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
          {t.emptyList}
        </p>
      ) : (
        value.map((line, index) => (
          <SupplyLineFields
            key={index}
            idPrefix={idPrefix}
            rowId={index}
            index={index}
            required={required}
            removable={value.length > 1 || !required}
            categories={categories}
            locale={locale}
            value={line}
            onChange={(patch) => update(index, patch)}
            onRemove={() => remove(index)}
            showExpiry={showExpiry}
            labels={labels}
            invalid={index === invalidIndex}
          />
        ))
      )}

      <button
        type="button"
        onClick={add}
        className="self-start rounded text-sm font-semibold text-navy underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
      >
        {t.addItem}
      </button>
    </fieldset>
  );
}
