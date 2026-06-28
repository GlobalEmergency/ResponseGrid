-- Fast text search + coordinate distance queries using standard contrib extensions.
-- pg_trgm: trigram similarity indexes for fuzzy name/address/city search.
-- cube + earthdistance: Euclidean earth-distance for geo proximity queries.
-- All three are bundled with PostgreSQL 16 contrib (no PostGIS required).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS cube;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS earthdistance;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS resources_name_trgm    ON resources USING gin (name    gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS resources_address_trgm ON resources USING gin (address gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS resources_city_trgm    ON resources USING gin (city    gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS resources_earth_gist   ON resources USING gist (ll_to_earth(latitude, longitude));
