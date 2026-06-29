import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('drizzle migration filenames', () => {
  it('does not keep the collided 0032/0034 filenames around', () => {
    const dir = resolve(__dirname, '../../drizzle');
    const files = new Set(
      readdirSync(dir).filter((name) => name.endsWith('.sql')),
    );

    expect(files.has('0032_offer_inventory.sql')).toBe(false);
    expect(files.has('0032_containers.sql')).toBe(false);
    expect(files.has('0032_users_created_last_login.sql')).toBe(false);
    expect(files.has('0034_shipment_containers.sql')).toBe(false);
    expect(files.has('0034_organization_contact_phone.sql')).toBe(false);

    expect(files.has('0036_offer_inventory.sql')).toBe(true);
    expect(files.has('0037_containers.sql')).toBe(true);
    expect(files.has('0038_users_created_last_login.sql')).toBe(true);
    expect(files.has('0039_shipment_containers.sql')).toBe(true);
    expect(files.has('0040_organization_contact_phone.sql')).toBe(true);
  });
});
