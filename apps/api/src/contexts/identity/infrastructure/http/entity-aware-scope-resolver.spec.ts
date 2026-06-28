import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { EntityAwareScopeResolver } from './entity-aware-scope-resolver';

interface Lookup {
  findEmergencyId(entityId: string): Promise<string | null>;
}

function lookup(map: Record<string, string>): Lookup {
  return { findEmergencyId: (id) => Promise.resolve(map[id] ?? null) };
}

function req(params: Record<string, string>): Request {
  return { params } as unknown as Request;
}

describe('EntityAwareScopeResolver', () => {
  const resource = lookup({ r1: 'E_victim' });
  const none = lookup({});
  const resolver = new EntityAwareScopeResolver(
    resource,
    none,
    none,
    none,
    none,
    none,
  );

  it("derives the chain from the entity's real owner, ignoring a client-supplied :emergencyId", async () => {
    // The attacker is a coordinator of E_self trying to act on r1 (in E_victim).
    const chain = await resolver.resolve(
      req({ emergencyId: 'E_self', resourceId: 'r1' }),
    );
    expect(chain).toEqual([
      { type: 'entity', entityType: 'resource', id: 'r1' },
      { type: 'emergency', id: 'E_victim' },
      { type: 'platform' },
    ]);
  });

  it('throws NotFound when the targeted entity does not exist', async () => {
    await expect(
      resolver.resolve(req({ resourceId: 'missing' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('falls back to the emergency-collection scope when no entity param is present', async () => {
    const chain = await resolver.resolve(req({ emergencyId: 'E1' }));
    expect(chain).toEqual([
      { type: 'emergency', id: 'E1' },
      { type: 'platform' },
    ]);
  });

  it('defaults to platform when there is nothing to scope', async () => {
    expect(await resolver.resolve(req({}))).toEqual([{ type: 'platform' }]);
  });
});
