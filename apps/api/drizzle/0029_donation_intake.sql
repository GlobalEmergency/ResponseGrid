-- Pre-registro de donaciones en acopio (DonationIntake · ficha #15).
-- Tablas nuevas; no altera offers ni users.

CREATE TABLE donation_intakes (
  id                  uuid PRIMARY KEY,
  emergency_id        uuid NOT NULL,
  target_resource_id  uuid NOT NULL,
  intake_code         text NOT NULL,
  status              text NOT NULL,
  donor_name          text NOT NULL,
  donor_phone         text,
  donor_email         text,
  donor_user_id       uuid,
  contact_normalized  text NOT NULL,
  volunteer_notes     text,
  evidence_file_key   text,
  received_at         timestamptz,
  received_by_user_id uuid,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT donation_intakes_contact_check
    CHECK (donor_phone IS NOT NULL OR donor_email IS NOT NULL),
  CONSTRAINT donation_intakes_status_check
    CHECK (status IN ('pending', 'received', 'rejected', 'incomplete')),
  CONSTRAINT donation_intakes_code_emergency_unique
    UNIQUE (emergency_id, intake_code)
);

CREATE INDEX donation_intakes_emergency_contact_idx
  ON donation_intakes (emergency_id, contact_normalized);

CREATE INDEX donation_intakes_emergency_code_idx
  ON donation_intakes (emergency_id, intake_code);

CREATE INDEX donation_intakes_resource_status_idx
  ON donation_intakes (target_resource_id, status);

CREATE TABLE donation_intake_lines (
  id          uuid PRIMARY KEY,
  intake_id   uuid NOT NULL REFERENCES donation_intakes(id) ON DELETE CASCADE,
  category    text NOT NULL,
  description text NOT NULL,
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit        text,
  notes       text,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE INDEX donation_intake_lines_intake_idx ON donation_intake_lines (intake_id);
