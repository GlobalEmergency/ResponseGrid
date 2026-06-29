-- #141 — la expedición (Shipment) habla el modelo de insumos y transporta
-- contenedores rastreables (#140).
--   1) container_ids: ids de los contenedores cargados (holder = shipment).
--   2) Reescribe items del VO suelto ShipmentItem ({description, quantity?,
--      unit?, category?}) al canónico SupplyLine ({name, quantity>=1, unit,
--      category obligatoria, presentation}). Idempotente: una fila ya en el
--      formato nuevo se reconstruye igual.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS container_ids uuid[] NOT NULL DEFAULT '{}';
--> statement-breakpoint
UPDATE shipments
SET items = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name',
        COALESCE(
          NULLIF(elem->>'name', ''),
          NULLIF(elem->>'description', ''),
          'Carga'
        ),
        'quantity', GREATEST(COALESCE((elem->>'quantity')::int, 1), 1),
        'unit', elem->'unit',
        'category', COALESCE(NULLIF(elem->>'category', ''), 'other'),
        'presentation', elem->'presentation'
      )
    )
    FROM jsonb_array_elements(items) AS elem
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof(items) = 'array';
