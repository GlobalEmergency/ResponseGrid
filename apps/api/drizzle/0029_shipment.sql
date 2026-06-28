CREATE TABLE IF NOT EXISTS "shipments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emergency_id" uuid NOT NULL,
	"origin_resource_id" uuid NOT NULL,
	"destination_resource_id" uuid NOT NULL,
	"items" jsonb NOT NULL,
	"assigned_capacity_id" uuid,
	"carrier_type" text,
	"carrier_id" uuid,
	"manifest" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_emergency_id_idx" ON "shipments" ("emergency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_status_idx" ON "shipments" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_assigned_capacity_id_idx" ON "shipments" ("assigned_capacity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_carrier_id_idx" ON "shipments" ("carrier_id");
