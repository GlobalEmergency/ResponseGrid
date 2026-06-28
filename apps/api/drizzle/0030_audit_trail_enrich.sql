-- Enrich the audit log so coordinator-facing actions (edit / discard during
-- validation) carry full traceability: the human-readable reason, the
-- before/after field changes, the state the entity transitioned to, and the
-- actor's display name. All columns are nullable so the existing generic
-- interceptor rows (and historical rows) remain valid.
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_name" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "changes" jsonb;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "target_status" text;
