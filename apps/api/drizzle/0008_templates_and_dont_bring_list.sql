-- Create templates table
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"dont_bring_list" text[] NOT NULL DEFAULT '{}',
	"default_announcement" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- Add dont_bring_list column to emergencies table
ALTER TABLE "emergencies" ADD COLUMN "dont_bring_list" text[] NOT NULL DEFAULT '{}';
