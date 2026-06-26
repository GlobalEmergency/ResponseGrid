CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"emergency_id" uuid NOT NULL,
	"donor_user_id" uuid NOT NULL,
	"donor_organization_id" uuid,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"target_need_id" uuid,
	"matched_need_id" uuid,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "offers_emergency_id_status_idx" ON "offers" ("emergency_id", "status");
--> statement-breakpoint
CREATE INDEX "offers_matched_need_id_idx" ON "offers" ("matched_need_id");
