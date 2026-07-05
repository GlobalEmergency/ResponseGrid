'use client';

import { useState } from 'react';
import type { Messages } from '@/i18n/messages/es';
import { PersonnelNeedFields } from '@/components/molecules/personnel-need-fields';
import { SupplyLineList } from '@/components/organisms/supply-line-list';
import { emptyLine, toDto, isComplete, type SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';
import { useLocale } from '@/i18n/locale-context';

interface ItemsFieldProps {
  t: Messages['peticion'];
  categories: readonly Category[];
}

/**
 * Editable list of needed supply lines. Categories are the FULL list (not
 * material-only) so `medical_personnel` stays selectable: when any row uses
 * that category, `PersonnelNeedFields` renders below the list to collect the
 * volunteer-skill request.
 */
export function ItemsField({ t, categories }: ItemsFieldProps) {
  const locale = useLocale();
  const [lines, setLines] = useState<SupplyLine[]>([emptyLine('food')]);

  const hasPersonnelCategory = lines.some(
    (line) => line.category === 'medical_personnel',
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
    addItem: t.items_add,
    legend: t.items_heading,
  };

  const serialized = JSON.stringify(lines.filter(isComplete).map(toDto));

  return (
    <div className="flex flex-col gap-4">
      <SupplyLineList
        value={lines}
        onChange={setLines}
        categories={categories}
        locale={locale}
        idPrefix="item"
        required
        defaultCategory="food"
        labels={labels}
      />

      <input type="hidden" name="items" value={serialized} />

      {hasPersonnelCategory && <PersonnelNeedFields />}
    </div>
  );
}
