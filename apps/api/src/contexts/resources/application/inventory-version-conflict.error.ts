/**
 * Optimistic-concurrency conflict on `PUT /resources/:id/inventory` (#294):
 * the caller's `expectedVersion` no longer matches the resource's current
 * `inventoryVersion` — someone else (an inventory-entry, the donation intake
 * worker, or another PUT) changed the declared inventory since the caller
 * loaded it. Mapped to 409 so the client reloads and retries instead of
 * silently overwriting the concurrent change.
 */
export class InventoryVersionConflictError extends Error {
  constructor() {
    super(
      'The inventory has changed since it was loaded; reload it and try again',
    );
    this.name = 'InventoryVersionConflictError';
  }
}
