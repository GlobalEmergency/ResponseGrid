'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { components } from '@reliefhub/api-client';
import { createShipment } from './actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { MATERIAL_CATEGORIES, categoryLabel } from '@/lib/categories';

/** A resource option for the origin/destination selects. */
export interface ResourceOption {
  id: string;
  name: string;
}

type CargoLine = components['schemas']['SupplyLineDto'];
type CargoCategory = CargoLine['category'];

interface ItemRow {
  name: string;
  quantity: string;
  unit: string;
  category: CargoCategory;
}

const EMPTY_ROW: ItemRow = {
  name: '',
  quantity: '1',
  unit: '',
  category: MATERIAL_CATEGORIES[0] as CargoCategory,
};

interface CreateShipmentProps {
  emergencyId: string;
  slug: string;
  resources: ResourceOption[];
}

/**
 * "Crear expedición" — a button that opens a drawer with a minimal create form:
 * origin/destination selects (from the emergency's resources), repeatable cargo
 * lines (the canonical SupplyLine: insumo + cantidad + unidad + categoría) and a
 * free-text manifiesto. On success the drawer closes and the route refreshes so
 * the new shipment appears.
 *
 * The loose lines use the shared material model (#141); loading trackable
 * containers (#140) onto a shipment is a separate flow, not part of this form.
 */
export function CreateShipment({
  emergencyId,
  slug,
  resources,
}: CreateShipmentProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [manifest, setManifest] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  function reset() {
    setOriginId('');
    setDestinationId('');
    setRows([{ ...EMPTY_ROW }]);
    setManifest('');
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
      .map((row): CargoLine | null => {
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
      .filter((x): x is CargoLine => x !== null);

    if (invalid) {
      setError(tc.ship_err_quantity_invalid);
      return;
    }
    if (items.length === 0) {
      setError(tc.ship_err_items_required);
      return;
    }

    startTransition(async () => {
      const result = await createShipment(emergencyId, slug, {
        originResourceId: originId,
        destinationResourceId: destinationId,
        items,
        ...(manifest.trim() !== '' ? { manifest: manifest.trim() } : {}),
      });
      if (result.status === 'success') {
        reset();
        setOpen(false);
        router.refresh();
      } else if (result.status === 'error') {
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
        {pending ? tc.ship_creating : tc.ship_create_submit}
      </Button>
    </div>
  );

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant="secondary">
        {tc.ship_create_cta}
      </Button>

      {open && (
        <DetailDrawer
          open={open}
          onClose={() => setOpen(false)}
          title={tc.ship_create_title}
          footer={footer}
        >
          <div className="flex flex-col gap-5">
            <FormField
              htmlFor="ship-origin"
              label={
                <>
                  {tc.ship_field_origin} <span aria-hidden="true">*</span>
                </>
              }
            >
              <Select
                id="ship-origin"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
              >
                <option value="" disabled>
                  {tc.ship_select_resource_placeholder}
                </option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              htmlFor="ship-destination"
              label={
                <>
                  {tc.ship_field_destination} <span aria-hidden="true">*</span>
                </>
              }
            >
              <Select
                id="ship-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              >
                <option value="" disabled>
                  {tc.ship_select_resource_placeholder}
                </option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Repeatable cargo lines (canonical SupplyLine) */}
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-ink uppercase tracking-wide">
                {tc.ship_items_legend} <span aria-hidden="true">*</span>
              </legend>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-line p-3"
                >
                  <Input
                    aria-label={tc.ship_item_description_label}
                    placeholder={tc.ship_item_description_placeholder}
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      aria-label={tc.ship_item_quantity_label}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      placeholder={tc.ship_item_quantity_placeholder}
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(index, { quantity: e.target.value })
                      }
                    />
                    <Input
                      aria-label={tc.ship_item_unit_label}
                      placeholder={tc.ship_item_unit_placeholder}
                      value={row.unit}
                      onChange={(e) => updateRow(index, { unit: e.target.value })}
                    />
                  </div>
                  <Select
                    aria-label={tc.ship_item_category_label}
                    value={row.category}
                    onChange={(e) =>
                      updateRow(index, {
                        category: e.target.value as CargoCategory,
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
                      className="self-start text-xs font-semibold text-danger underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-danger rounded"
                    >
                      {tc.ship_item_remove}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="self-start text-sm font-semibold text-navy underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 rounded"
              >
                {tc.ship_item_add}
              </button>
            </fieldset>

            <FormField
              htmlFor="ship-manifest"
              label={
                <>
                  {tc.ship_field_manifest}{' '}
                  <span className="text-muted-soft font-normal normal-case">
                    {tc.optional}
                  </span>
                </>
              }
            >
              <Textarea
                id="ship-manifest"
                rows={3}
                placeholder={tc.ship_manifest_placeholder}
                value={manifest}
                onChange={(e) => setManifest(e.target.value)}
              />
            </FormField>
          </div>
        </DetailDrawer>
      )}
    </>
  );
}
