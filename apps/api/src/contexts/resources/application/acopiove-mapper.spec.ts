import { acopioveMapper } from './acopiove-mapper';
import { ResourceType, ResourceStage } from '../domain/resource-enums';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

function makeRecord(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: VALID_UUID,
    name: 'Punto de Acopio Calle Mayor',
    address: 'Calle Mayor 1, Valencia',
    latitude: 39.4699,
    longitude: -0.3763,
    recibe: ['agua', 'ropa'],
    necesitaAhora: 'Necesitamos agua urgente',
    horario: 'L-V 9-18h',
    contacto: '600123456',
    responsable: 'María García',
    fuente: 'Cruz Roja',
    pais: 'España',
    ciudad: 'Valencia',
    tipo: 'acopio',
    updatedAt: '2024-01-15T10:30:00.000Z',
    ...overrides,
  };
}

describe('acopioveMapper', () => {
  it('maps tipo:acopio to collection_point / origin', () => {
    const result = acopioveMapper(makeRecord({ tipo: 'acopio' }));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ResourceType.CollectionPoint);
    expect(result!.stage).toBe(ResourceStage.Origin);
  });

  it('maps tipo:refugio to venue / destination', () => {
    const result = acopioveMapper(makeRecord({ tipo: 'refugio' }));
    expect(result).not.toBeNull();
    expect(result!.type).toBe(ResourceType.Venue);
    expect(result!.stage).toBe(ResourceStage.Destination);
  });

  it('sets acceptsRawLabels from recibe[] without resolving', () => {
    const result = acopioveMapper(makeRecord({ recibe: ['agua', 'ropa', 'medicamentos'] }));
    expect(result).not.toBeNull();
    expect(result!.acceptsRawLabels).toEqual(['agua', 'ropa', 'medicamentos']);
  });

  it('maps ciudad → city, pais → country', () => {
    const result = acopioveMapper(makeRecord({ ciudad: 'Sevilla', pais: 'España' }));
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Sevilla');
    expect(result!.country).toBe('España');
  });

  it('maps contacto → contact, horario → schedule, responsable → manager', () => {
    const result = acopioveMapper(
      makeRecord({ contacto: '600111222', horario: '9-18h', responsable: 'Juan' }),
    );
    expect(result).not.toBeNull();
    expect(result!.contact).toBe('600111222');
    expect(result!.schedule).toBe('9-18h');
    expect(result!.manager).toBe('Juan');
  });

  it('maps updatedAt string to externalUpdatedAt Date', () => {
    const isoString = '2024-01-15T10:30:00.000Z';
    const result = acopioveMapper(makeRecord({ updatedAt: isoString }));
    expect(result).not.toBeNull();
    expect(result!.externalUpdatedAt).toEqual(new Date(isoString));
  });

  it('sets externalUpdatedAt to null when updatedAt is absent', () => {
    const raw = makeRecord();
    (raw as Record<string, unknown>).updatedAt = undefined;
    const result = acopioveMapper(raw);
    expect(result).not.toBeNull();
    expect(result!.externalUpdatedAt).toBeNull();
  });

  it('sets raw to the original record', () => {
    const raw = makeRecord();
    const result = acopioveMapper(raw);
    expect(result).not.toBeNull();
    expect(result!.raw).toBe(raw);
  });

  it('sets externalId to the record id', () => {
    const result = acopioveMapper(makeRecord({ id: VALID_UUID }));
    expect(result).not.toBeNull();
    expect(result!.externalId).toBe(VALID_UUID);
  });

  it('composes a description from necesitaAhora and fuente', () => {
    const result = acopioveMapper(
      makeRecord({ necesitaAhora: 'Ropa de abrigo', fuente: 'Ayuntamiento' }),
    );
    expect(result).not.toBeNull();
    expect(result!.description).toBeTruthy();
    // description should include both pieces of info
    expect(result!.description).toContain('Ropa de abrigo');
    expect(result!.description).toContain('Ayuntamiento');
  });

  it('accepts string coordinates (API may return "34.0456000" as string)', () => {
    const result = acopioveMapper(makeRecord({ latitude: '39.4699', longitude: '-0.3763' }));
    expect(result).not.toBeNull();
    expect(result!.latitude).toBeCloseTo(39.4699);
    expect(result!.longitude).toBeCloseTo(-0.3763);
  });

  it('returns null when latitude is not parseable as a number', () => {
    const result = acopioveMapper(makeRecord({ latitude: 'no-es-numero' }));
    expect(result).toBeNull();
  });

  it('returns null when longitude is not parseable as a number', () => {
    const result = acopioveMapper(makeRecord({ longitude: NaN }));
    expect(result).toBeNull();
  });

  it('returns null when id is not a valid UUID', () => {
    const result = acopioveMapper(makeRecord({ id: 'not-a-uuid' }));
    expect(result).toBeNull();
  });

  it('returns null when id is missing', () => {
    const result = acopioveMapper(makeRecord({ id: undefined }));
    expect(result).toBeNull();
  });

  it('returns null for unknown tipo when it cannot be mapped', () => {
    const result = acopioveMapper(makeRecord({ tipo: 'desconocido' }));
    expect(result).toBeNull();
  });
});
