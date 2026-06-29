-- Unifica la oferta al modelo de línea de material compartido (SupplyLine):
-- DonationOffer pasa de una sola línea (category/description/quantity/unit) a
-- items: SupplyLine[]. Misma forma que need_items / resource_items /
-- donation_intake_lines. Se hace back-fill de las ofertas existentes (1 línea,
-- la descripción como nombre) antes de retirar las columnas viejas. (#145)

CREATE TABLE IF NOT EXISTS "offer_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"offer_id" uuid NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text,
	"category" text NOT NULL,
	"presentation" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_items_offer_id_idx" ON "offer_items" ("offer_id");
--> statement-breakpoint
-- Back-fill: cada oferta existente se convierte en una línea de insumo
-- (la descripción pasa a ser el nombre del insumo).
INSERT INTO "offer_items" ("id", "offer_id", "name", "quantity", "unit", "category", "presentation")
SELECT gen_random_uuid(), "id", "description", "quantity", "unit", "category", NULL
FROM "offers";
--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "category";
--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "quantity";
--> statement-breakpoint
ALTER TABLE "offers" DROP COLUMN IF EXISTS "unit";
