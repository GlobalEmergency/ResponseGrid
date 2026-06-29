-- Alinea los códigos de insumo al formato canónico INS-NNNN (4 dígitos) que
-- valida el dominio (`Supply`, ^INS-\d{4}$). La semilla 0037 los sembró como
-- INS-NNN (3 dígitos). Fix-forward: 0037 ya está aplicada y es inmutable, así
-- que la corrección va en una migración nueva.
--
-- Idempotente: el WHERE solo matchea los de 3 dígitos, de modo que reaplicarla
-- sobre códigos ya padeados (INS-0001) no hace nada. La unicidad se conserva
-- (001->0001, 211->0211 siguen siendo distintos).

UPDATE "supplies"
SET "code" = 'INS-' || lpad(substring("code" FROM 5), 4, '0')
WHERE "code" ~ '^INS-[0-9]{3}$';
