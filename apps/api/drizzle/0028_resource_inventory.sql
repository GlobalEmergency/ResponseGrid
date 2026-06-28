-- Inventario declarado por recurso/lugar: líneas de insumo (SupplyLine) — qué
-- material/productos tiene para entregar. Habilita el control de inventario de
-- los distintos puntos/almacenes. Misma forma que need_items: nombre, cantidad,
-- unidad, categoría (slug de la taxonomía, igual que `accepts`) y presentación
-- (vía de administración, vertical sanitario). FK con borrado en cascada para
-- que el inventario desaparezca con su recurso.
CREATE TABLE "resource_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text,
	"category" text NOT NULL,
	"presentation" text
);
--> statement-breakpoint
CREATE INDEX "resource_items_resource_id_idx" ON "resource_items" ("resource_id");
