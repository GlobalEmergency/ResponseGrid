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
  /** Prefill the editor with existing lines (inventory edit, #263). */
  initialLines?: SupplyLine[];
  /**
   * Serialize every row instead of silently dropping incomplete ones. On edit
   * surfaces the save REPLACES the persisted inventory, so a half-edited row
   * must fail validation server-side rather than be deleted without warning;
   * the create flows keep the lenient filter (an unfinished optional row never
   * blocks the submit).
   */
  strict?: boolean;
  /**
   * Offer the full category taxonomy instead of material-only. The API accepts
   * (and other intakes persist) the whole `Category` enum, so the edit surface
   * must be able to display and round-trip e.g. health-vertical lines it did
   * not create.
   */
  allowAllCategories?: boolean;
  /**
   * Index of the row the last submit's server-side validation error points at
   * (#296) — surfaced by `strict` surfaces via `parseSupplyLines`' `invalidRow`
   * so the offending row is highlighted instead of making the user scan a long
   * inventory for it.
   */
  invalidRowIndex?: number;
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
  initialLines,
  strict = false,
  allowAllCategories = false,
  invalidRowIndex,
}: InventoryFieldProps) {
  const materialCategories = categories.filter(isMaterialCategory);
  const selectableCategories = allowAllCategories ? categories : materialCategories;
  // New rows still default to the first MATERIAL category on every surface.
  const defaultCategory = materialCategories[0]?.slug ?? '';

  const [lines, setLines] = useState<SupplyLine[]>(
    initialLines ?? (startWithOneRow ? [emptyLine(defaultCategory)] : []),
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

  // Lenient (create) surfaces serialize only complete rows so an unfinished
  // optional row never blocks the submit; strict (edit) surfaces serialize
  // everything so an incomplete row surfaces a validation error instead of
  // being silently deleted by the replace-style save.
  const serialized = JSON.stringify(
    (strict ? lines : lines.filter(isComplete)).map(toDto),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted normal-case">{t.inventory_hint}</p>

      <SupplyLineList
        value={lines}
        onChange={setLines}
        categories={selectableCategories}
        locale={locale}
        idPrefix="inv"
        required={false}
        defaultCategory={defaultCategory}
        showExpiry
        labels={labels}
        invalidIndex={invalidRowIndex}
      />

      {/* Hidden input carries serialized items to the server action */}
      <input type="hidden" name="items" value={serialized} />
    </div>
  );
}
