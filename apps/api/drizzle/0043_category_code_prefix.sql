-- Add "code_prefix" column to "categories" table to allow category-based prefixes (#222).
-- Root categories are seeded with their respective 3-letter prefixes (in English).
-- Child categories will inherit the prefix from their root parent.

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "code_prefix" text;

UPDATE "categories" SET "code_prefix" = 'FOD' WHERE "slug" = 'food';
UPDATE "categories" SET "code_prefix" = 'WAT' WHERE "slug" = 'water';
UPDATE "categories" SET "code_prefix" = 'HYG' WHERE "slug" = 'hygiene';
UPDATE "categories" SET "code_prefix" = 'MED' WHERE "slug" = 'medical';
UPDATE "categories" SET "code_prefix" = 'SHE' WHERE "slug" = 'shelter';
UPDATE "categories" SET "code_prefix" = 'CLO' WHERE "slug" = 'clothing';
UPDATE "categories" SET "code_prefix" = 'TOL' WHERE "slug" = 'tools';
UPDATE "categories" SET "code_prefix" = 'OTH' WHERE "slug" = 'other';
