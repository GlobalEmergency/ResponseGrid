-- Listas de recomendación y "qué sí llevar" para templates y emergencias.
ALTER TABLE templates ADD COLUMN recommended_list text[] NOT NULL DEFAULT '{}';
ALTER TABLE emergencies ADD COLUMN recommended_list text[] NOT NULL DEFAULT '{}';
