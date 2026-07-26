-- Auto-ocultado opcional como política por emergencia (#171).
-- Off por defecto: no cambia el comportamiento de ninguna emergencia existente
-- hasta que un coordinador la active explícitamente.
ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS auto_hide_on_dispute boolean NOT NULL DEFAULT false;
