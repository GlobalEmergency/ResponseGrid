import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizeBackendError } from './backend-error-messages.ts';
import { es } from '../i18n/messages/es.ts';

const t = es.backendErrors;
const FALLBACK = 'No se pudo enviar el formulario.';

test('maps the "resource does not exist in this emergency" domain error (#296)', () => {
  assert.equal(
    localizeBackendError(
      t,
      'Resource 1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8 does not exist in this emergency',
      FALLBACK,
    ),
    t.resource_not_in_emergency,
  );
});

test('maps known SupplyLine validation messages', () => {
  assert.equal(
    localizeBackendError(t, 'SupplyLine name must not be empty', FALLBACK),
    t.supply_name_required,
  );
  assert.equal(
    localizeBackendError(t, 'SupplyLine quantity must be a positive integer', FALLBACK),
    t.supply_quantity_invalid,
  );
  assert.equal(
    localizeBackendError(
      t,
      'SupplyLine expiresAt must be a valid YYYY-MM-DD date',
      FALLBACK,
    ),
    t.supply_expiry_invalid,
  );
});

test('maps the "offer must have at least one supply line" domain error (#348)', () => {
  assert.equal(
    localizeBackendError(t, 'An offer must have at least one supply line', FALLBACK),
    t.offer_items_required,
  );
});

test('maps offer target-need domain errors', () => {
  assert.equal(
    localizeBackendError(
      t,
      'Target need not found: 1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
      FALLBACK,
    ),
    t.target_need_not_found,
  );
  assert.equal(
    localizeBackendError(
      t,
      "Target need '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8' does not belong to emergency '2e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8'",
      FALLBACK,
    ),
    t.target_need_wrong_emergency,
  );
});

test('maps logistics capacity domain errors', () => {
  assert.equal(
    localizeBackendError(
      t,
      'Transport capacity must declare at least weightKg or volumeM3',
      FALLBACK,
    ),
    t.capacity_weight_or_volume_required,
  );
  assert.equal(
    localizeBackendError(t, 'Capacity weightKg must be greater than 0, got -3', FALLBACK),
    t.capacity_amount_invalid,
  );
  assert.equal(
    localizeBackendError(t, 'Area coverage must not be empty', FALLBACK),
    t.coverage_area_required,
  );
  assert.equal(
    localizeBackendError(
      t,
      "Capacity window from must be a valid ISO date, got 'nope'",
      FALLBACK,
    ),
    t.capacity_window_invalid_date,
  );
  assert.equal(
    localizeBackendError(
      t,
      "Capacity window 'from' (2026-01-02) must not be after 'to' (2026-01-01)",
      FALLBACK,
    ),
    t.capacity_window_order_invalid,
  );
});

test('maps by stable `code` first, ignoring stale message prose (#348)', () => {
  assert.equal(
    localizeBackendError(
      t,
      { code: 'resource_not_in_emergency', message: 'some divergent English text' },
      FALLBACK,
    ),
    t.resource_not_in_emergency,
  );
});

test('maps every known code directly, one per KNOWN_BACKEND_ERRORS entry (#348)', () => {
  const knownCodes: (keyof typeof t)[] = [
    'supply_name_required',
    'supply_quantity_invalid',
    'supply_expiry_invalid',
    'resource_not_in_emergency',
    'target_need_not_found',
    'target_need_wrong_emergency',
    'offer_items_required',
    'capacity_weight_or_volume_required',
    'capacity_amount_invalid',
    'coverage_area_required',
    'capacity_window_invalid_date',
    'capacity_window_order_invalid',
  ];
  for (const code of knownCodes) {
    assert.equal(localizeBackendError(t, { code }, FALLBACK), t[code]);
  }
});

test('falls back to message-prose matching when `code` is missing or unrecognized', () => {
  assert.equal(
    localizeBackendError(
      t,
      { code: 'some_future_code_not_localized_yet', message: 'Target need not found: x' },
      FALLBACK,
    ),
    t.target_need_not_found,
  );
  assert.equal(
    localizeBackendError(t, { message: 'Area coverage must not be empty' }, FALLBACK),
    t.coverage_area_required,
  );
});

test('falls back to the caller-provided message for anything unmapped', () => {
  assert.equal(localizeBackendError(t, 'boom, something exploded', FALLBACK), FALLBACK);
  assert.equal(localizeBackendError(t, undefined, FALLBACK), FALLBACK);
  assert.equal(localizeBackendError(t, null, FALLBACK), FALLBACK);
  assert.equal(localizeBackendError(t, '', FALLBACK), FALLBACK);
  assert.equal(localizeBackendError(t, 42, FALLBACK), FALLBACK);
});
