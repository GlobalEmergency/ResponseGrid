-- Hueco 2 (#150, §16.3 / #108): autoridad transversal de hub en expediciones.
--
-- Una expedición puede referenciar un hub logístico: un id de scope opaco,
-- transversal a emergencias (como carrier_id — sin FK, no hay tabla de hubs).
-- Un grant `hub_manager` con scope sobre ese hub podrá operar la expedición sin
-- ser coordinador de su emergencia. Nullable: la mayoría de expediciones no
-- transitan un hub.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS hub_id uuid;
