-- Reporte ciudadano de validez de puntos (ficha 15): un usuario autenticado
-- avisa de que un punto de acopio está cerrado / ya no existe / se ha mudado /
-- tiene datos desactualizados. Al acumular N reportes de usuarios distintos, el
-- recurso se marca `disputed` (sigue visible, con aviso) hasta que coordinación
-- lo resuelve (confirmar cierre, marcar inválido o descartar).
ALTER TABLE "resources" ADD COLUMN "disputed" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "disputed_at" timestamptz;
--> statement-breakpoint
CREATE TABLE "resource_validity_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
	"emergency_id" uuid NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"photo_urls" text[] NOT NULL DEFAULT '{}',
	"status" text NOT NULL DEFAULT 'open',
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"resolved_by_user_id" uuid,
	"resolved_at" timestamptz
);
--> statement-breakpoint
-- Un reporte abierto por (recurso, usuario): cada fila `open` es un reportante
-- distinto; reenviar actualiza el suyo en vez de sumar otro voto.
CREATE UNIQUE INDEX "resource_validity_one_open_per_user" ON "resource_validity_reports" ("resource_id","reporter_user_id") WHERE "status" = 'open';
--> statement-breakpoint
CREATE INDEX "resource_validity_open_by_resource" ON "resource_validity_reports" ("resource_id") WHERE "status" = 'open';
--> statement-breakpoint
CREATE INDEX "resource_validity_by_emergency" ON "resource_validity_reports" ("emergency_id");
--> statement-breakpoint
CREATE INDEX "resources_disputed_idx" ON "resources" ("emergency_id") WHERE "disputed" = true;
