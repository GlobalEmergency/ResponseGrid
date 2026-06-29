'use client';

import { useState } from 'react';
import { MATERIAL_CATEGORIES, categoryLabel } from '@/lib/categories';

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

let nextId = 1;

function makeItem(): Item {
  return {
    id: nextId++,
    name: '',
    quantity: 1,
    unit: '',
    category: MATERIAL_CATEGORIES[0],
  };
}

/**
 * Labels consumed by {@link InventoryField}. A structural subset shared by the
 * registrar form (`Messages['registrar']`) and the citizen pre-registration
 * form (`Messages['prereg']['lines']`), so the same editor serves both surfaces
 * without coupling to one feature's message namespace.
 */
export interface InventoryFieldLabels {
  inventory_heading: string;
  inventory_hint: string;
  inventory_add: string;
  inventory_empty: string;
  item_number: string;
  item_remove: string;
  item_remove_label: string;
  item_name_label: string;
  item_name_placeholder: string;
  item_quantity_label: string;
  item_unit_label: string;
  item_unit_opt: string;
  item_unit_placeholder: string;
  item_category_label: string;
}

interface InventoryFieldProps {
  t: InventoryFieldLabels;
  locale: 'es' | 'en';
  /**
   * Start with one empty row instead of an empty list. Used by surfaces where
   * at least one line is expected (citizen pre-registration), versus the
   * registrar where declared inventory is fully optional.
   */
  startWithOneRow?: boolean;
}

/**
 * Editable list of supply lines (`SupplyLine[]`). Originally the optional
 * declared inventory for `/registrar`; now also reused by `/pre-registro`.
 * Category options come from the single canonical source (lib/categories), so
 * needs, offers and inventory stay consistent. Serializes the filled rows
 * (non-empty name) to a hidden `items` input as JSON.
 */
export function InventoryField({
  t,
  locale,
  startWithOneRow = false,
}: InventoryFieldProps) {
  const [items, setItems] = useState<Item[]>(
    startWithOneRow ? [makeItem()] : [],
  );

  const categories = MATERIAL_CATEGORIES.map((slug) => ({
    value: slug,
    label: categoryLabel(slug, locale),
  }));

  // Serialize only rows that have a name — empty rows are ignored so the field
  // stays optional and never blocks the submit.
  const serialized = JSON.stringify(
    items
      .filter((i) => i.name.trim() !== '')
      .map(({ name, quantity, unit, category }) => ({
        name: name.trim(),
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

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-ink uppercase tracking-wide">
            {t.inventory_heading}{' '}
            <span className="text-muted-soft font-normal normal-case">
              (opcional)
            </span>
          </p>
          <p className="text-xs text-muted normal-case">{t.inventory_hint}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="shrink-0 text-sm font-semibold text-ink underline underline-offset-2 hover:text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded"
        >
          {t.inventory_add}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-line px-4 py-3 text-sm text-muted">
          {t.inventory_empty}
        </p>
      ) : (
        items.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border-2 border-line p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                {t.item_number.replace('{n}', String(index + 1))}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t.item_remove.replace('{n}', String(index + 1))}
                className="text-sm text-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 rounded"
              >
                {t.item_remove_label}
              </button>
            </div>

            {/* Nombre del material / insumo */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`inv-name-${item.id}`}
                className="text-sm font-medium text-ink-soft"
              >
                {t.item_name_label} <span aria-hidden="true">*</span>
              </label>
              <input
                id={`inv-name-${item.id}`}
                type="text"
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
                  htmlFor={`inv-qty-${item.id}`}
                  className="text-sm font-medium text-ink-soft"
                >
                  {t.item_quantity_label} <span aria-hidden="true">*</span>
                </label>
                <input
                  id={`inv-qty-${item.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, {
                      quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                />
              </div>

              {/* Unidad */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`inv-unit-${item.id}`}
                  className="text-sm font-medium text-ink-soft"
                >
                  {t.item_unit_label}{' '}
                  <span className="text-muted-soft font-normal">
                    {t.item_unit_opt}
                  </span>
                </label>
                <input
                  id={`inv-unit-${item.id}`}
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
                htmlFor={`inv-cat-${item.id}`}
                className="text-sm font-medium text-ink-soft"
              >
                {t.item_category_label} <span aria-hidden="true">*</span>
              </label>
              <select
                id={`inv-cat-${item.id}`}
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
        ))
      )}

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />
    </div>
  );
}
