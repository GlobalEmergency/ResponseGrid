'use client';

import { useState } from 'react';
import type { Messages } from '@/i18n/messages/es';
import {
  SupplyLineRowFields,
  type SupplyLineRowLabels,
} from '@/components/molecules/supply-line-row-fields';
import { MATERIAL_CATEGORIES } from '@/lib/categories';

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

interface InventoryFieldProps {
  t: Messages['registrar'];
  locale: 'es' | 'en';
}

/**
 * Optional declared inventory (supply lines) for the place being registered:
 * qué material/insumos tiene para entregar. Mirrors the petición items field
 * but the list starts empty — a point can be registered with no declared stock.
 * Category options come from the single canonical source (lib/categories), so
 * needs, offers and inventory stay consistent. Serializes the filled rows
 * (non-empty name) to a hidden `items` input as JSON.
 */
export function InventoryField({ t, locale }: InventoryFieldProps) {
  const [items, setItems] = useState<Item[]>([]);

  const labels: SupplyLineRowLabels = {
    itemNumber: t.item_number,
    itemRemove: t.item_remove,
    itemRemoveLabel: t.item_remove_label,
    nameLabel: t.item_name_label,
    namePlaceholder: t.item_name_placeholder,
    quantityLabel: t.item_quantity_label,
    unitLabel: t.item_unit_label,
    unitOpt: t.item_unit_opt,
    unitPlaceholder: t.item_unit_placeholder,
    categoryLabel: t.item_category_label,
  };

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
          <SupplyLineRowFields
            key={item.id}
            rowId={item.id}
            index={index}
            idPrefix="inv"
            required={false}
            removable
            categories={MATERIAL_CATEGORIES}
            locale={locale}
            labels={labels}
            value={item}
            onChange={(patch) => updateItem(item.id, patch)}
            onRemove={() => removeItem(item.id)}
          />
        ))
      )}

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />
    </div>
  );
}
