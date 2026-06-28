-- Taxonomía de tipos de destinatario final (EPIC #59 · #62).
-- Catálogo extensible (slug PK + labels ES/EN + orden). Añadir un tipo nuevo
-- es insertar una fila — sin tocar enums del dominio. Global por ahora; la
-- configuración por emergencia queda como evolución futura (ver docs/features/14).
CREATE TABLE recipient_types (
  slug     text primary key,
  label_es text not null,
  label_en text not null,
  sort     int  not null default 0
);

INSERT INTO recipient_types (slug, label_es, label_en, sort) VALUES
  ('hospital',          'Hospital',         'Hospital',          10),
  ('clinic',            'Clínica',          'Clinic',            20),
  ('organization',      'Organización',     'Organization',      30),
  ('company',           'Empresa',          'Company',           40),
  ('collection_center', 'Centro de acopio', 'Collection center', 50),
  ('individual',        'Particular',       'Individual',        60),
  ('other',             'Otro',             'Other',             90)
ON CONFLICT (slug) DO NOTHING;
