-- #294: PUT /resources/:id/inventory replaced the declared inventory with an
-- unconditional delete+reinsert (no concurrency control), so a line merged
-- concurrently by POST /resources/:id/inventory-entries or the donation intake
-- worker (both via Resource.receiveInventory) between the owner's form load
-- and their save was silently discarded (lost update). This counter backs an
-- optimistic-concurrency check: the owner's PUT must send back the version it
-- read (`expectedVersion`), bumped on every inventory change; a mismatch means
-- someone else changed the inventory in the meantime and the write is
-- rejected with 409 instead of overwriting it.
ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "inventory_version" integer NOT NULL DEFAULT 0;
