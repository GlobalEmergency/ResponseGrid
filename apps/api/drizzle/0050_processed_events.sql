-- Generic idempotency ledger for domain-event consumers (#129). Each consumer
-- records the events it has already applied, keyed by (consumer, dedup_key), so
-- an at-least-once redelivery from the shared queue does not re-run the effect
-- (e.g. double-counting received donation stock). Reusable by every consumer of
-- the fan-out, not inventory-specific.

CREATE TABLE IF NOT EXISTS "processed_events" (
  "consumer" text NOT NULL,
  "dedup_key" text NOT NULL,
  "processed_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("consumer", "dedup_key")
);
