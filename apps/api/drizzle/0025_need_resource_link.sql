-- Vínculo opcional necesidad → recurso / destinatario final (EPIC #59 · #60).
-- Habilita el registro 1‑a‑N de un destinatario y sus necesidades. Columna
-- nullable y sin FK por ahora, consistente con emergency_id (que tampoco
-- declara FK en este esquema); puede endurecerse a FK más adelante.
ALTER TABLE needs ADD COLUMN resource_id uuid;
CREATE INDEX needs_resource ON needs(resource_id) WHERE resource_id IS NOT NULL;
