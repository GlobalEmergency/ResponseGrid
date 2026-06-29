'use client';

import { useState } from 'react';
import type { Messages } from '@/i18n/messages/es';
import { PersonnelNeedFields } from '@/components/molecules/personnel-need-fields';
import {
  SupplyLineRowFields,
  type SupplyLineRowLabels,
} from '@/components/molecules/supply-line-row-fields';
import { useLocale } from '@/i18n/locale-context';
import { ALL_CATEGORIES } from '@/lib/categories';

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
        <SupplyLineRowFields
          key={item.id}
          rowId={item.id}
          index={index}
          idPrefix="item"
          required
          removable={items.length > 1}
          categories={ALL_CATEGORIES}
          locale={locale}
          labels={labels}
          value={item}
          onChange={(patch) => updateItem(item.id, patch)}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />

      {/* Personnel detail fields — visible when at least one item is medical_personnel */}
      {hasPersonnelCategory && <PersonnelNeedFields />}
    </div>
  );
}
