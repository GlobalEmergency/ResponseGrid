ALTER TABLE "emergencies" ADD COLUMN "announcement" text;--> statement-breakpoint
ALTER TABLE "emergencies" ADD COLUMN "updated_at" timestamp with time zone NOT NULL;