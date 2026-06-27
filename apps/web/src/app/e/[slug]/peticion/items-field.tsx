'use client';

import { useEffect, useState } from 'react';
import type { Messages } from '@/i18n/messages/es';

const CATEGORY_VALUES = ['hygiene', 'water', 'food', 'medical', 'shelter', 'tools', 'other'] as const;
type Category = (typeof CATEGORY_VALUES)[number];

interface Item {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: Category;
}

let nextId = 1;

function makeItem(): Item {
  return { id: nextId++, name: '', quantity: 1, unit: '', category: 'other' };
}

interface ItemsFieldProps {
  t: Messages['peticion'];
}

export function ItemsField({ t }: ItemsFieldProps) {
  const [items, setItems] = useState<Item[]>([makeItem()]);

  const categories = [
    { value: 'hygiene' as Category, label: t.category_hygiene },
    { value: 'water' as Category, label: t.category_water },
    { value: 'food' as Category, label: t.category_food },
    { value: 'medical' as Category, label: t.category_medical },
    { value: 'shelter' as Category, label: t.category_shelter },
    { value: 'tools' as Category, label: t.category_tools },
    { value: 'other' as Category, label: t.category_other },
  ];

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
        <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {t.items_heading} <span aria-hidden="true">*</span>
        </p>
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
        >
          {t.items_add}
        </button>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-lg border-2 border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.item_number.replace('{n}', String(index + 1))}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t.item_remove.replace('{n}', String(index + 1))}
                className="text-sm text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 rounded"
              >
                {t.item_remove_label}
              </button>
            )}
          </div>

          {/* Nombre del artículo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`item-name-${item.id}`}
              className="text-sm font-medium text-gray-700"
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
              className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cantidad */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`item-qty-${item.id}`}
                className="text-sm font-medium text-gray-700"
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
                className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              />
            </div>

            {/* Unidad */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`item-unit-${item.id}`}
                className="text-sm font-medium text-gray-700"
              >
                {t.item_unit_label}{' '}
                <span className="text-gray-400 font-normal">{t.item_unit_opt}</span>
              </label>
              <input
                id={`item-unit-${item.id}`}
                type="text"
                value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                placeholder={t.item_unit_placeholder}
                className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`item-cat-${item.id}`}
              className="text-sm font-medium text-gray-700"
            >
              {t.item_category_label} <span aria-hidden="true">*</span>
            </label>
            <select
              id={`item-cat-${item.id}`}
              required
              value={item.category}
              onChange={(e) =>
                updateItem(item.id, { category: e.target.value as Category })
              }
              className="w-full rounded-lg border-2 border-gray-900 bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
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
    </div>
  );
}
