-- Reception check-in (#129): when the operator confirms a donation and the
-- lines actually received differ from the declared ones, the received lines
-- overwrite the intake lines and this column records the mandatory reason for
-- the adjustment (audit trail). Nullable: null means received == declared.

ALTER TABLE "donation_intakes"
  ADD COLUMN IF NOT EXISTS "reception_adjustment_reason" text;
