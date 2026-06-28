/**
 * AcopioveMapper — pure function that converts a raw acopiove.org record into
 * a MappedResourceInput understood by IngestExternalResources.
 *
 * Contract:
 *  - Returns null (skip) when the record is structurally invalid:
 *    · id is absent or not a valid UUID
 *    · latitude or longitude are non-numeric / NaN
 *    · tipo cannot be mapped to a known ResourceType
 *  - acceptsRawLabels is passed through as-is; category resolution happens
 *    inside IngestExternalResources via CategoryResolver.
 */

import { ResourceType, ResourceStage } from '../domain/resource-enums';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MappedResourceInput = {
  externalId: string;
  type: ResourceType;
  stage: ResourceStage;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  acceptsRawLabels: string[];
  country: string | null;
  city: string | null;
  externalUpdatedAt: Date | null;
  raw: unknown;
};

export type ResourceMapper = (raw: unknown) => MappedResourceInput | null;

type AcopioveRecord = {
  id?: unknown;
  name?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  recibe?: unknown;
  necesitaAhora?: unknown;
  horario?: unknown;
  contacto?: unknown;
  responsable?: unknown;
  fuente?: unknown;
  pais?: unknown;
  ciudad?: unknown;
  tipo?: unknown;
  updatedAt?: unknown;
};

function mapTipo(
  tipo: unknown,
): { type: ResourceType; stage: ResourceStage } | null {
  switch (tipo) {
    case 'acopio':
      return {
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
      };
    case 'refugio':
      return { type: ResourceType.Venue, stage: ResourceStage.Destination };
    default:
      return null;
  }
}

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const parsed = parseFloat(v);
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringOrNull(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
    return String(v);
  return null;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

function toDateOrNull(v: unknown): Date | null {
  if (v === undefined || v === null) return null;
  const d = new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d;
}

export const acopioveMapper: ResourceMapper = (
  raw: unknown,
): MappedResourceInput | null => {
  const r = raw as AcopioveRecord;

  // Guard: id must be a valid UUID
  if (!isValidUuid(r.id)) return null;

  // Guard: coordinates must be parseable to finite numbers (API may return strings)
  const latitude = toFiniteNumber(r.latitude);
  const longitude = toFiniteNumber(r.longitude);
  if (latitude === null) return null;
  if (longitude === null) return null;

  // Guard: tipo must map to a known type
  const typeMapping = mapTipo(r.tipo);
  if (!typeMapping) return null;

  const name = toStringOrNull(r.name) ?? 'Sin nombre';
  const ciudad = toStringOrNull(r.ciudad);
  const pais = toStringOrNull(r.pais);
  const addressFallback = [ciudad, pais].filter(Boolean).join(', ') || '—';
  const address = toStringOrNull(r.address) ?? addressFallback;
  const necesitaAhora = toStringOrNull(r.necesitaAhora);
  const fuente = toStringOrNull(r.fuente);

  // Compose description from necesitaAhora + fuente
  const descParts: string[] = [];
  if (necesitaAhora) descParts.push(necesitaAhora);
  if (fuente) descParts.push(`Fuente: ${fuente}`);
  const description = descParts.length > 0 ? descParts.join(' | ') : null;

  return {
    externalId: r.id,
    type: typeMapping.type,
    stage: typeMapping.stage,
    name,
    description,
    address,
    latitude,
    longitude,
    contact: toStringOrNull(r.contacto),
    schedule: toStringOrNull(r.horario),
    manager: toStringOrNull(r.responsable),
    acceptsRawLabels: toStringArray(r.recibe),
    country: pais,
    city: ciudad,
    externalUpdatedAt: toDateOrNull(r.updatedAt),
    raw,
  };
};
