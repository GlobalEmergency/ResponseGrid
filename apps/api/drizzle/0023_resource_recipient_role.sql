-- Destinatario final (EPIC #59 · #60): rol "destinatario final" sobre un recurso
-- en etapa de destino, con tipo de destinatario extensible (slug validado por la
-- taxonomía por emergencia, #62). Ambos campos son aditivos y retrocompatibles.
ALTER TABLE resources
  ADD COLUMN is_final_recipient boolean NOT NULL DEFAULT false,
  ADD COLUMN recipient_type text;
CREATE INDEX resources_final_recipient ON resources(emergency_id) WHERE is_final_recipient;
