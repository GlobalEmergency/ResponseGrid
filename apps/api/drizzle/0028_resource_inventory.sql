-- Inventario declarado por recurso/lugar (qué material/productos tiene para
-- entregar). Habilita el control de inventario de los distintos puntos/almacenes.
-- Mismo patrón que need_items: líneas con nombre, cantidad, unidad y categoría
-- (slug de la taxonomía, igual que `accepts`). FK con borrado en cascada para
-- que el inventario desaparezca con su recurso.
CREATE TABLE "resource_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "resource_items_resource_id_idx" ON "resource_items" ("resource_id");
