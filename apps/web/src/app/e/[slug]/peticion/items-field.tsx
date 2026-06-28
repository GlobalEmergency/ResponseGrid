'use client';

import { useEffect, useState } from 'react';
import type { Messages } from '@/i18n/messages/es';
import { PersonnelNeedFields } from '@/components/molecules/personnel-need-fields';
import { useLocale } from '@/i18n/locale-context';
import { ALL_CATEGORIES, categoryLabel } from '@/lib/categories';

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

let nextId = 1;

function makeItem(): Item {
  return { id: nextId++, name: '', quantity: 1, unit: '', category: 'food' };
}

interface ItemsFieldProps {
  t: Messages['peticion'];
}

export function ItemsField({ t }: ItemsFieldProps) {
  const [items, setItems] = useState<Item[]>([makeItem()]);
  const locale = useLocale();

  // Show personnel fields when at least one item is in the medical_personnel category
  const hasPersonnelCategory = items.some(
    (item) => item.category === 'medical_personnel',
  );

  const categories = ALL_CATEGORIES.map((slug) => ({
    value: slug,
    label: categoryLabel(slug, locale),
  }));

  // Serialize to hidden input on every change
  const serialized = JSON.stringify(
    items.map(({ name, quantity, unit, category }) => ({
      name,
      quantity,
      ...(unit.trim() !== '' ? { unit: unit.trim() } : {}),
      category,
    })),
  );

  const updateItem = (id: number, patch: Partial<Omit<Item, 'id'>>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () => setItems((prev) => [...prev, makeItem()]);

  const removeItem = (id: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev; // keep at least 1
      return prev.filter((item) => item.id !== id);
    });
  };

  // Suppress hydration warning on the hidden input value
  useEffect(() => {}, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink uppercase tracking-wide">
          {t.items_heading} <span aria-hidden="true">*</span>
        </p>
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-semibold text-ink underline underline-offset-2 hover:text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded"
        >
          {t.items_add}
        </button>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-lg border-2 border-line p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">
              {t.item_number.replace('{n}', String(index + 1))}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t.item_remove.replace('{n}', String(index + 1))}
                className="text-sm text-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 rounded"
              >
                {t.item_remove_label}
              </button>
            )}
          </div>

          {/* Nombre del artículo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`item-name-${item.id}`}
              className="text-sm font-medium text-ink-soft"
            >
              {t.item_name_label} <span aria-hidden="true">*</span>
            </label>
            <input
              id={`item-name-${item.id}`}
              type="text"
              required
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder={t.item_name_placeholder}
              className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cantidad */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`item-qty-${item.id}`}
                className="text-sm font-medium text-ink-soft"
              >
                {t.item_quantity_label} <span aria-hidden="true">*</span>
              </label>
              <input
                id={`item-qty-${item.id}`}
                type="number"
                min={1}
                step={1}
                required
                value={item.quantity}
                onChange={(e) =>
                  updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })
                }
                className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              />
            </div>

            {/* Unidad */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`item-unit-${item.id}`}
                className="text-sm font-medium text-ink-soft"
              >
                {t.item_unit_label}{' '}
                <span className="text-muted-soft font-normal">{t.item_unit_opt}</span>
              </label>
              <input
                id={`item-unit-${item.id}`}
                type="text"
                value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                placeholder={t.item_unit_placeholder}
                className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`item-cat-${item.id}`}
              className="text-sm font-medium text-ink-soft"
            >
              {t.item_category_label} <span aria-hidden="true">*</span>
            </label>
            <select
              id={`item-cat-${item.id}`}
              required
              value={item.category}
              onChange={(e) =>
                updateItem(item.id, { category: e.target.value })
              }
              className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              {categories.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />

      {/* Personnel detail fields — visible when at least one item is medical_personnel */}
      {hasPersonnelCategory && <PersonnelNeedFields />}
    </div>
  );
}
