-- Empaquetado rastreable (#140): un contenedor (palet/caja/lote) con identidad
-- propia, su código legible/QR generado (PAL-0001…), composición por referencia
-- (parent_container_id, self-FK), contenido en líneas SupplyLine (jsonb),
-- peso/volumen declarados, holder polimórfico (resource|shipment, sin FK) y
-- estado open→sealed. Vive en supplies (upstream), reutilizable por logística e
-- inventario. Self-FK ON DELETE SET NULL: borrar un padre desancla a los hijos.
CREATE TABLE IF NOT EXISTS "containers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emergency_id" uuid NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"parent_container_id" uuid REFERENCES "containers"("id") ON DELETE SET NULL,
	"lines" jsonb NOT NULL,
	"gross_weight_kg" double precision,
	"gross_volume_m3" double precision,
	"holder_type" text,
	"holder_id" uuid,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "containers_emergency_code_uniq" ON "containers" ("emergency_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_emergency_id_idx" ON "containers" ("emergency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_parent_container_id_idx" ON "containers" ("parent_container_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_holder_idx" ON "containers" ("holder_type","holder_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_type_idx" ON "containers" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_status_idx" ON "containers" ("status");
