'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordInventoryEntry } from '../actions';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { SupplyLineList } from '@/components/organisms/supply-line-list';
import { emptyLine, toDto, isComplete, type SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface RecordInventoryEntryProps {
  resourceId: string;
  categories: readonly Category[];
}

/**
 * Manual inventory entry for a point/warehouse (#9). Captures one or more
 * supply lines and posts them to the point stock; the server sums them into
 * the existing inventory. Reuses the same line-row shape as the shipment cargo
 * form so the material model is entered consistently everywhere.
 */
export function RecordInventoryEntry({ resourceId, categories }: RecordInventoryEntryProps) {
  const locale = useLocale();
  const ta = getMessages(locale).admin;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultCategory = categories[0]?.slug ?? '';

  const [lines, setLines] = useState<SupplyLine[]>([emptyLine(defaultCategory)]);
  const [error, setError] = useState<string | undefined>(undefined);

  const labels = {
    nameLabel: ta.centros_detail_inv_name_label,
    namePlaceholder: ta.centros_detail_inv_name_ph,
    quantityLabel: ta.centros_detail_inv_qty_label,
    unitLabel: ta.centros_detail_inv_unit_label,
    unitPlaceholder: ta.centros_detail_inv_unit_ph,
    categoryLabel: ta.centros_detail_inv_category_label,
    addItem: ta.centros_detail_inv_add,
    itemRemoveLabel: ta.centros_detail_inv_remove,
    legend: ta.centros_detail_inv_items_legend,
  };

  function reset() {
    setLines([emptyLine(defaultCategory)]);
    setError(undefined);
  }

  function handleSubmit() {
    setError(undefined);

    const items = lines.filter(isComplete).map(toDto);

    if (items.length === 0) {
      setError(ta.centros_detail_inv_err_items);
      return;
    }

    startTransition(async () => {
      const result = await recordInventoryEntry(resourceId, items);
      if (result.status === 'success') {
        reset();
        setOpen(false);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  const footer = (
    <div className="flex flex-col gap-3">
      {error !== undefined && <ErrorMessage message={error} />}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        fullWidth
        size="lg"
      >
        {pending
          ? ta.centros_detail_inv_submitting
          : ta.centros_detail_inv_submit}
      </Button>
    </div>
  );

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="secondary"
        size="sm"
      >
        + {ta.centros_detail_inv_cta}
      </Button>

      {open && (
        <DetailDrawer
          open={open}
          onClose={() => setOpen(false)}
          title={ta.centros_detail_inv_title}
          footer={footer}
        >
          <div className="flex flex-col gap-5">
            <p className="text-sm text-ink-soft">{ta.centros_detail_inv_intro}</p>

            <SupplyLineList
              value={lines}
              onChange={setLines}
              categories={categories}
              locale={locale}
              idPrefix="inv-entry"
              required
              defaultCategory={defaultCategory}
              labels={labels}
            />
          </div>
        </DetailDrawer>
      )}
    </>
  );
}
