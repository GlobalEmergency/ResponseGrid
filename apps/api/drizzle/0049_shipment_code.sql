-- Código Único de expedición (#163): `shipments.code` (EXP-0001) + su allocator
-- monótono por emergencia, espejo de containers.code (#140, migración 0032/0033).
-- El código legible/QR identifica el camión/avión para aerolínea, aduana y
-- destino, sin depender del UUID interno.

-- Allocator por emergencia (upsert atómico, igual que container_code_sequences):
-- a prueba de concurrencia y de borrados (el código nunca se reutiliza).
CREATE TABLE IF NOT EXISTS "shipment_code_sequences" (
	"emergency_id" uuid NOT NULL,
	"last_value" integer NOT NULL,
	CONSTRAINT "shipment_code_sequences_pkey" PRIMARY KEY ("emergency_id")
);

-- Columna nullable primero para poder rellenar las expediciones existentes.
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "code" text;

-- Backfill: EXP-NNNN por emergencia, en orden de creación.
WITH numbered AS (
	SELECT id,
	       row_number() OVER (
	         PARTITION BY emergency_id ORDER BY created_at, id
	       ) AS seq
	FROM "shipments"
	WHERE "code" IS NULL
)
UPDATE "shipments" s
SET "code" = 'EXP-' || lpad(numbered.seq::text, 4, '0')
FROM numbered
WHERE s.id = numbered.id;

-- Sembrar el allocator al máximo usado por emergencia para que las nuevas
-- expediciones continúen la secuencia sin colisionar con el backfill.
INSERT INTO "shipment_code_sequences" ("emergency_id", "last_value")
SELECT emergency_id, count(*)
FROM "shipments"
GROUP BY emergency_id
ON CONFLICT ("emergency_id") DO UPDATE
	SET "last_value" = GREATEST(
		"shipment_code_sequences"."last_value", EXCLUDED."last_value"
	);

ALTER TABLE "shipments" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_emergency_code_uniq"
	ON "shipments" ("emergency_id", "code");
