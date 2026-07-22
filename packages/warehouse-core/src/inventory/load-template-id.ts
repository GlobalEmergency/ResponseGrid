import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link LoadTemplate} — la dotación tipo de una misión/vehículo.
 * A UUID value object like every other aggregate id in the platform: a kit
 * keeps its identity across renames and re-loads.
 */
export class LoadTemplateId {
  private constructor(public readonly value: string) {}

  static create(): LoadTemplateId {
    return new LoadTemplateId(randomUUID());
  }

  static fromString(s: string): LoadTemplateId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid LoadTemplateId: ${s}`);
    return new LoadTemplateId(s);
  }

  equals(o: LoadTemplateId): boolean {
    return this.value === o.value;
  }
}
