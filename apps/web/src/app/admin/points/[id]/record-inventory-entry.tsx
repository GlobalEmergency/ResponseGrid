'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { components } from '@reliefhub/api-client';
import { recordInventoryEntry } from '../actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { MATERIAL_CATEGORIES, categoryLabel } from '@/lib/categories';

type SupplyLine = components['schemas']['SupplyLineDto'];
type SupplyCategory = SupplyLine['category'];

interface ItemRow {
  name: string;
  quantity: string;
  unit: string;
  category: SupplyCategory;
}

const EMPTY_ROW: ItemRow = {
  name: '',
  quantity: '1',
  unit: '',
  category: MATERIAL_CATEGORIES[0] as SupplyCategory,
};

/**
 * Manual inventory entry for a point/warehouse (#9). Captures one or more
 * supply lines and posts them to the point stock; the server sums them into
 * the existing inventory. Reuses the same line-row shape as the shipment cargo
 * form so the material model is entered consistently everywhere.
 */
export function RecordInventoryEntry({ resourceId }: { resourceId: string }) {
  const locale = useLocale();
  const ta = getMessages(locale).admin;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [error, setError] = useState<string | undefined>(undefined);

  function reset() {
    setRows([{ ...EMPTY_ROW }]);
    setError(undefined);
  }

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function handleSubmit() {
    setError(undefined);

    let invalid = false;
    const items = rows
      .map((row): SupplyLine | null => {
        const name = row.name.trim();
        if (name === '') return null;
        const quantity = Number(row.quantity.trim());
        if (!Number.isInteger(quantity) || quantity < 1) {
          invalid = true;
          return null;
        }
        const unit = row.unit.trim();
        return {
          name,
          quantity,
          category: row.category,
          ...(unit !== '' ? { unit } : {}),
        };
      })
      .filter((x): x is SupplyLine => x !== null);

    if (invalid) {
      setError(ta.centros_detail_inv_err_qty);
      return;
    }
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

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold uppercase tracking-wide text-ink">
                {ta.centros_detail_inv_items_legend}
              </legend>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-line p-3"
                >
                  <Input
                    aria-label={ta.centros_detail_inv_name_label}
                    placeholder={ta.centros_detail_inv_name_ph}
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      aria-label={ta.centros_detail_inv_qty_label}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      placeholder={ta.centros_detail_inv_qty_ph}
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(index, { quantity: e.target.value })
                      }
                    />
                    <Input
                      aria-label={ta.centros_detail_inv_unit_label}
                      placeholder={ta.centros_detail_inv_unit_ph}
                      value={row.unit}
                      onChange={(e) => updateRow(index, { unit: e.target.value })}
                    />
                  </div>
                  <Select
                    aria-label={ta.centros_detail_inv_category_label}
                    value={row.category}
                    onChange={(e) =>
                      updateRow(index, {
                        category: e.target.value as SupplyCategory,
                      })
                    }
                  >
                    {MATERIAL_CATEGORIES.map((slug) => (
                      <option key={slug} value={slug}>
                        {categoryLabel(slug, locale)}
                      </option>
                    ))}
                  </Select>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="self-start rounded text-xs font-semibold text-danger underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-danger"
                    >
                      {ta.centros_detail_inv_remove}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="self-start rounded text-sm font-semibold text-navy underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                {ta.centros_detail_inv_add}
              </button>
            </fieldset>
          </div>
        </DetailDrawer>
      )}
    </>
  );
}
