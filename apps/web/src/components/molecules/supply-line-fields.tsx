'use client';

import type { ReactNode } from 'react';
import { getMessages, type Locale } from '@/i18n';
import type { Messages } from '@/i18n/messages/es';
import { SupplySelector } from '@/components/molecules/supply-selector';
import { useSupplyLine } from '@/hooks/use-supply-line';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';

/**
 * Smoothly reveals/hides the extra fields (unit + category + optional expiry)
 * when the line switches between "catalogue"/"idle" and "free" mode. Pure CSS:
 * the `grid-template-rows: 0fr → 1fr` trick animates height in BOTH directions
 * with no library and no measuring. Content stays mounted (so the height can
 * animate); `inert` when closed keeps it out of tab order and off the a11y
 * tree, and `motion-reduce` honours the user's reduced-motion setting.
 */
function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="min-h-0 overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  );
}

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
  hideHeader?: boolean;
}

export function SupplyLineFields({
  idPrefix, rowId, index, required, removable, categories, locale,
  value, onChange, onRemove, labels, showExpiry = false, hideHeader = false,
}: SupplyLineFieldsProps) {
  const t = { ...getMessages(locale).supplyLine, ...labels };
  const n = String(index + 1);
  // unit / category / (optional) expiry all reveal together in "free" mode.
  const { showCategory: showExtra, selector } = useSupplyLine({
    value, categories, onChange,
  });

  // Presentation / route of administration is health-vertical only (#61): reveal
  // it when the line's category is medical (parent 'medical' or one of its
  // children), independent of catalogue/free mode.
  const selectedCategory = categories.find((c) => c.slug === value.category);
  const isMedical =
    selectedCategory != null &&
    (selectedCategory.slug === 'medical' ||
      selectedCategory.parentSlug === 'medical');

  const fieldClass =
    'w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2';

  return (
    <div className="rounded-lg border-2 border-line p-4">
      <div className="flex flex-col gap-3">
        {!hideHeader && (
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
        )}

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-qty-${rowId}`} className="text-sm font-medium text-ink-soft">
            {t.quantityLabel} <span aria-hidden="true">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-label={t.qtyDecrease}
              onClick={() => onChange({ quantity: Math.max(1, value.quantity - 1) })}
              disabled={value.quantity <= 1}
              className="flex w-12 shrink-0 items-center justify-center rounded-lg border-2 border-navy bg-white text-2xl leading-none font-semibold text-navy transition-colors hover:bg-navy hover:text-white focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-navy"
            >
              −
            </button>
            <input
              id={`${idPrefix}-qty-${rowId}`}
              type="number" min={1} step={1} required={required}
              inputMode="numeric"
              value={value.quantity}
              onChange={(e) => onChange({ quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
              className="min-w-0 flex-1 rounded-lg border-2 border-navy bg-white px-4 py-3 text-center text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label={t.qtyIncrease}
              onClick={() => onChange({ quantity: value.quantity + 1 })}
              className="flex w-12 shrink-0 items-center justify-center rounded-lg border-2 border-navy bg-white text-2xl leading-none font-semibold text-navy transition-colors hover:bg-navy hover:text-white focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <Collapsible open={isMedical}>
        <div className="flex flex-col gap-1.5 pt-3">
          <label htmlFor={`${idPrefix}-pres-${rowId}`} className="text-sm font-medium text-ink-soft">
            {t.presentationLabel} <span className="text-muted-soft font-normal">{t.presentationOpt}</span>
          </label>
          <input
            id={`${idPrefix}-pres-${rowId}`}
            type="text"
            list={`${idPrefix}-pres-opts-${rowId}`}
            value={value.presentation ?? ''}
            onChange={(e) => onChange({ presentation: e.target.value })}
            placeholder={t.presentationPlaceholder}
            className={fieldClass}
          />
          <datalist id={`${idPrefix}-pres-opts-${rowId}`}>
            {t.presentationOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
      </Collapsible>

      <Collapsible open={showExtra}>
        <div className="flex flex-col gap-3 pt-3">
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

          {showExpiry && (
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
        </div>
      </Collapsible>
    </div>
  );
}
