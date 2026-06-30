'use client';

import { useState } from 'react';
import {
  SupplyLineRowFields,
  type SupplyLineRowLabels,
} from '@/components/molecules/supply-line-row-fields';
import { MATERIAL_CATEGORIES } from '@/lib/categories';

interface Item {
  id: number;
  name: string;
  supplyId: string | null;
  quantity: number;
  unit: string;
  category: string;
  expiresAt: string;
}

let nextId = 1;

function makeItem(): Item {
  return {
    id: nextId++,
    name: '',
    supplyId: null,
    quantity: 1,
    unit: '',
    category: MATERIAL_CATEGORIES[0],
    expiresAt: '',
  };
}

/**
 * Labels consumed by {@link InventoryField}. A structural subset shared by the
 * registrar form (`Messages['registrar']`) and the citizen pre-registration
 * form (`Messages['prereg']['lines']`), so the same editor serves both surfaces
 * without coupling to one feature's message namespace.
 *
 * `item_expiry_label` and `item_expiry_opt` are optional — when omitted the
 * expiry date row is hidden, so pre-registration forms that don't declare expiry
 * still type-check without adding the keys to their message namespace.
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
  item_expiry_label?: string;
  item_expiry_opt?: string;
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
    expiryLabel: t.item_expiry_label,
    expiryOpt: t.item_expiry_opt,
  };

  // Serialize only rows that have a name — empty rows are ignored so the field
  // stays optional and never blocks the submit.
  const serialized = JSON.stringify(
    items
      .filter((i) => i.name.trim() !== '')
      .map(({ name, supplyId, quantity, unit, category, expiresAt }) => ({
        name: name.trim(),
        ...(supplyId !== null ? { supplyId } : {}),
        quantity,
        ...(unit.trim() !== '' ? { unit: unit.trim() } : {}),
        category,
        ...(expiresAt !== '' ? { expiresAt } : {}),
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
          className="shrink-0 rounded text-sm font-semibold text-ink underline underline-offset-2 hover:text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
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
