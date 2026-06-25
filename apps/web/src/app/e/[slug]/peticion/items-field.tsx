'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = [
  { value: 'hygiene', label: 'Higiene' },
  { value: 'water', label: 'Agua' },
  { value: 'food', label: 'Alimentos' },
  { value: 'medical', label: 'Sanitario' },
  { value: 'shelter', label: 'Refugio' },
  { value: 'tools', label: 'Herramientas' },
  { value: 'other', label: 'Otro' },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

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

export function ItemsField() {
  const [items, setItems] = useState<Item[]>([makeItem()]);

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
          Artículos <span aria-hidden="true">*</span>
        </p>
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 rounded"
        >
          + Añadir artículo
        </button>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-lg border-2 border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Artículo {index + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Eliminar artículo ${index + 1}`}
                className="text-sm text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 rounded"
              >
                Quitar
              </button>
            )}
          </div>

          {/* Nombre del artículo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`item-name-${item.id}`}
              className="text-sm font-medium text-gray-700"
            >
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id={`item-name-${item.id}`}
              type="text"
              required
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              placeholder="Ej. Mantas térmicas"
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
                Cantidad <span aria-hidden="true">*</span>
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
                Unidad{' '}
                <span className="text-gray-400 font-normal">(opt.)</span>
              </label>
              <input
                id={`item-unit-${item.id}`}
                type="text"
                value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                placeholder="cajas, litros…"
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
              Categoría <span aria-hidden="true">*</span>
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
              {CATEGORIES.map(({ value, label }) => (
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
