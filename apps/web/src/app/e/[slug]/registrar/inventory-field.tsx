'use client';

import { useState } from 'react';
import { SupplyLineList } from '@/components/organisms/supply-line-list';
import { emptyLine, toDto, isComplete, type SupplyLine } from '@/domain/supplies/supply-line';
import { isMaterialCategory, type Category } from '@/domain/supplies/category';

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
  categories: readonly Category[];
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
 * Category options come from the DB (`categories` prop, material-only), so
 * needs, offers and inventory stay consistent. Serializes the filled rows
 * (via `isComplete`/`toDto`) to a hidden `items` input as JSON.
 */
export function InventoryField({
  t,
  locale,
  categories,
  startWithOneRow = false,
}: InventoryFieldProps) {
  const materialCategories = categories.filter(isMaterialCategory);
  const defaultCategory = materialCategories[0]?.slug ?? '';

  const [lines, setLines] = useState<SupplyLine[]>(
    startWithOneRow ? [emptyLine(defaultCategory)] : [],
  );

  const labels = {
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
    ...(t.item_expiry_label !== undefined ? { expiryLabel: t.item_expiry_label } : {}),
    ...(t.item_expiry_opt !== undefined ? { expiryOpt: t.item_expiry_opt } : {}),
    addItem: t.inventory_add,
    emptyList: t.inventory_empty,
    legend: t.inventory_heading,
  };

  // Serialize only complete rows — empty rows are ignored so the field stays
  // optional and never blocks the submit.
  const serialized = JSON.stringify(lines.filter(isComplete).map(toDto));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted normal-case">{t.inventory_hint}</p>

      <SupplyLineList
        value={lines}
        onChange={setLines}
        categories={materialCategories}
        locale={locale}
        idPrefix="inv"
        required={false}
        defaultCategory={defaultCategory}
        showExpiry
        labels={labels}
      />

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />
    </div>
  );
}
