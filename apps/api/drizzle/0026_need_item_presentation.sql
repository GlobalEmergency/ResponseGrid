-- Presentación / vía de administración de un ítem de necesidad (EPIC #59 · #61).
-- Distingue ampolla / EV / inhalador de pastilla / jarabe — clave para saber si
-- un medicamento sirve para uso hospitalario directo. Columna nullable y libre
-- (extensible), igual que `unit`.
ALTER TABLE need_items ADD COLUMN presentation text;
