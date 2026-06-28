-- Capacidad de transporte (EPIC #103 · #105). Oferta de un servicio logístico
-- (no de material): un proveedor (voluntario u organización: transportista /
-- naviera / aerolínea) ofrece mover carga de un punto a otro, con modo,
-- capacidad (peso/volumen), corredor (origen → destino opcional) o área,
-- ventana temporal y restricciones. Distinto del agregado material `offers`.
CREATE TABLE IF NOT EXISTS transport_capacities (
  id                       uuid PRIMARY KEY,
  emergency_id             uuid NOT NULL,
  provider_type            text NOT NULL,
  provider_id              uuid NOT NULL,
  mode                     text NOT NULL,
  weight_kg                double precision,
  volume_m3                double precision,
  origin_municipality      text NOT NULL,
  destination_municipality text,
  available_from           timestamptz NOT NULL,
  available_until          timestamptz,
  refrigerated             boolean NOT NULL DEFAULT false,
  notes                    text,
  status                   text NOT NULL,
  created_at               timestamptz NOT NULL,
  updated_at               timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS transport_capacities_emergency_idx
  ON transport_capacities (emergency_id);
