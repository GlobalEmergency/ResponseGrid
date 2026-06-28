-- Baseline taxonomy: categories and aliases that ship with every deployment.
-- Uses ON CONFLICT DO NOTHING so re-running is safe (idempotent).
--
-- Insertion order: parent categories first, then children (medical/*).
-- PostgreSQL validates self-FK at statement end for a single multi-row INSERT,
-- so the two-batch approach (parents then children) is sufficient.

-- ── Parent categories ──────────────────────────────────────────────────────────
INSERT INTO categories (slug, label_es, label_en, parent_slug, vertical, sort) VALUES
  ('food',            'Alimentos', 'Food',    NULL, 'general', 10),
  ('water',           'Agua',      'Water',   NULL, 'general', 20),
  ('hygiene',         'Higiene',   'Hygiene', NULL, 'general', 30),
  ('medical',         'Médico',    'Medical', NULL, 'general', 40),
  ('shelter',         'Refugio',   'Shelter', NULL, 'general', 50),
  ('clothing',        'Ropa',      'Clothing',NULL, 'general', 60),
  ('tools',           'Herramientas','Tools', NULL, 'general', 70),
  ('other',           'Otros',     'Other',   NULL, 'general', 99)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- ── Child categories (parent_slug = 'medical') ────────────────────────────────
INSERT INTO categories (slug, label_es, label_en, parent_slug, vertical, sort) VALUES
  ('medicines',          'Medicamentos',       'Medicines',         'medical', 'general', 41),
  ('medical_equipment',  'Equipamiento médico','Medical equipment', 'medical', 'general', 42),
  ('medical_supplies',   'Insumos médicos',    'Medical supplies',  'medical', 'general', 43),
  ('medical_personnel',  'Personal médico',    'Medical personnel', 'medical', 'general', 44)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- ── Category aliases (normalised label → canonical slug) ──────────────────────
INSERT INTO category_aliases (alias_norm, category_slug) VALUES
  -- water
  ('agua',                     'water'),
  ('agua potable',             'water'),
  -- food
  ('alimentos',                'food'),
  ('alimentos no perecederos', 'food'),
  ('comida',                   'food'),
  ('viveres',                  'food'),
  -- clothing
  ('ropa',                     'clothing'),
  ('abrigos',                  'clothing'),
  ('ropa y abrigos',           'clothing'),
  -- medicines
  ('medicamentos',             'medicines'),
  ('medicinas',                'medicines'),
  -- medical_supplies
  ('insumos medicos',          'medical_supplies'),
  ('material medico',          'medical_supplies'),
  -- hygiene
  ('higiene',                  'hygiene'),
  ('aseo',                     'hygiene'),
  ('panales',                  'hygiene'),
  -- shelter
  ('frazadas',                 'shelter'),
  ('cobijas',                  'shelter'),
  ('mantas',                   'shelter'),
  ('cobertores',               'shelter')
ON CONFLICT DO NOTHING;
