-- Allocator monótono de códigos de contenedor por (emergencia, tipo) — refuerza
-- el "Código Único" de #140. Sustituye el conteo count(*)+1 (no atómico: dos
-- creaciones concurrentes generaban el mismo código y la 2ª violaba el índice
-- único; borrar un contenedor reutilizaba un código). El reparto se hace con un
-- upsert atómico (INSERT … ON CONFLICT (emergency_id, type) DO UPDATE SET
-- last_value = last_value + 1 RETURNING last_value), monótono y a prueba de
-- concurrencia y de borrados.
CREATE TABLE IF NOT EXISTS "container_code_sequences" (
	"emergency_id" uuid NOT NULL,
	"type" text NOT NULL,
	"last_value" integer NOT NULL,
	CONSTRAINT "container_code_sequences_pkey" PRIMARY KEY ("emergency_id","type")
);
