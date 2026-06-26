/**
 * Shared Kernel — EmergencyId value object.
 *
 * This file is a DELIBERATE shared kernel: EmergencyId is a cross-cutting
 * identifier used by every bounded context (emergencies, needs, resources,
 * metrics). Placing it here avoids duplicating the same validation logic in
 * each context while keeping the module pure domain (no framework, no I/O,
 * only node:crypto). Bounded contexts consume this kernel but do NOT share
 * aggregates or business rules through it.
 */
import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class EmergencyId {
  private constructor(public readonly value: string) {}

  static create(): EmergencyId {
    return new EmergencyId(randomUUID());
  }

  static fromString(s: string): EmergencyId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid EmergencyId: ${s}`);
    return new EmergencyId(s);
  }

  equals(o: EmergencyId): boolean {
    return this.value === o.value;
  }
}
