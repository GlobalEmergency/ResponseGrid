CREATE TABLE IF NOT EXISTS "transport_capacities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emergency_id" uuid NOT NULL,
	"provider_type" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"weight_kg" double precision,
	"volume_m3" double precision,
	"coverage" jsonb NOT NULL,
	"window_from" timestamp with time zone,
	"window_to" timestamp with time zone,
	"constraints" text[] NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transport_capacities_emergency_id_idx" ON "transport_capacities" ("emergency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transport_capacities_status_idx" ON "transport_capacities" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transport_capacities_mode_idx" ON "transport_capacities" ("mode");
