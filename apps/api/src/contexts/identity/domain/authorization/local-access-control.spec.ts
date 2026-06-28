import { LocalAccessControl } from './local-access-control';
import { AuthorizationContext } from './access-control';
import { Grant } from './grant';
import { ScopeRef, ScopeRefProps } from './scope-ref';

const PRINCIPAL = '11111111-1111-4111-8111-111111111111';

function ctxWith(...grants: Grant[]): AuthorizationContext {
  return {
    principalId: PRINCIPAL,
    grants: grants.map((g) => g.toSnapshot()),
  };
}

function chain(...scopes: ScopeRef[]): ScopeRefProps[] {
  return scopes.map((s) => s.toPlain());
}

describe('LocalAccessControl', () => {
  const ac = new LocalAccessControl();

  it('ignores a malformed grant (unknown scope type) without crashing the decision', async () => {
    // A forged/stale JWT grant with a scope type the runtime does not know.
    const valid = Grant.create({
      id: 'g1',
      principalId: PRINCIPAL,
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency('venezuela'),
    }).toSnapshot();
    const malformed = {
      ...valid,
      id: 'g2',
      scope: {
        type: 'customs_zone',
        id: 'la-guaira',
      } as unknown as (typeof valid)['scope'],
    };
    const ctx: AuthorizationContext = {
      principalId: PRINCIPAL,
      grants: [malformed, valid],
    };
    const resource = {
      scopeChain: chain(ScopeRef.emergency('venezuela'), ScopeRef.platform()),
    };
    // The malformed grant contributes nothing; the valid one still applies.
    await expect(ac.can(ctx, 'resource:verify', resource)).resolves.toBe(true);
    await expect(
      ac.can(
        { principalId: PRINCIPAL, grants: [malformed] },
        'resource:verify',
        resource,
      ),
    ).resolves.toBe(false);
  });

  it('a coordinator of an emergency can verify a resource in that emergency', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'emergency_coordinator',
        scope: ScopeRef.emergency('venezuela'),
      }),
    );
    const resource = {
      scopeChain: chain(
        ScopeRef.entity('resource', 'r1'),
        ScopeRef.emergency('venezuela'),
        ScopeRef.platform(),
      ),
    };
    await expect(ac.can(ctx, 'resource:verify', resource)).resolves.toBe(true);
  });

  it('a coordinator of one emergency cannot act in another', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'emergency_coordinator',
        scope: ScopeRef.emergency('venezuela'),
      }),
    );
    const otherEmergency = {
      scopeChain: chain(ScopeRef.emergency('dana'), ScopeRef.platform()),
    };
    await expect(ac.can(ctx, 'resource:verify', otherEmergency)).resolves.toBe(
      false,
    );
  });

  it('a platform_admin can act anywhere', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'platform_admin',
        scope: ScopeRef.platform(),
      }),
    );
    const resource = {
      scopeChain: chain(ScopeRef.emergency('any'), ScopeRef.platform()),
    };
    await expect(ac.can(ctx, 'accreditation:grant', resource)).resolves.toBe(
      true,
    );
  });

  it('a group_manager can create tasks in their group but not verify resources', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'group_manager',
        scope: ScopeRef.group('norte'),
      }),
    );
    const inGroup = {
      scopeChain: chain(
        ScopeRef.group('norte'),
        ScopeRef.emergency('venezuela'),
        ScopeRef.platform(),
      ),
    };
    await expect(ac.can(ctx, 'task:create', inGroup)).resolves.toBe(true);
    await expect(ac.can(ctx, 'resource:verify', inGroup)).resolves.toBe(false);
  });

  it('an expired grant confers nothing', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'emergency_coordinator',
        scope: ScopeRef.emergency('venezuela'),
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      }),
    );
    const resource = {
      scopeChain: chain(ScopeRef.emergency('venezuela'), ScopeRef.platform()),
    };
    await expect(ac.can(ctx, 'resource:verify', resource)).resolves.toBe(false);
  });

  it('an unknown role contributes nothing', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'made_up_role',
        scope: ScopeRef.platform(),
      }),
    );
    const resource = { scopeChain: chain(ScopeRef.platform()) };
    await expect(ac.can(ctx, 'resource:read', resource)).resolves.toBe(false);
  });

  it('composes grants across DAG parents (hub manager + emergency coordinator)', async () => {
    // A shipment that belongs to an emergency AND transits a hub: two parents.
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'emergency_coordinator',
        scope: ScopeRef.emergency('venezuela'),
      }),
      Grant.create({
        id: 'g2',
        principalId: PRINCIPAL,
        roleId: 'group_manager',
        scope: ScopeRef.group('hub-valencia'),
      }),
    );
    const shipment = {
      scopeChain: chain(
        ScopeRef.entity('shipment', 's1'),
        ScopeRef.group('hub-valencia'),
        ScopeRef.emergency('venezuela'),
        ScopeRef.platform(),
      ),
    };
    const perms = await ac.effectivePermissions(ctx, shipment.scopeChain);
    // permission from the coordinator parent…
    expect(perms.has('resource:verify')).toBe(true);
    // …and from the hub (group_manager) parent
    expect(perms.has('task:create')).toBe(true);
  });

  it('a hub_manager sees cargo transiting its hub across emergencies (§16.3 DAG)', async () => {
    // Ana manages the Valencia hub and holds NO grant in any emergency.
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'hub_manager',
        scope: ScopeRef.hub('valencia'),
      }),
    );
    // A shipment bound for the "dana" emergency that transits the Valencia hub:
    // two DAG parents (hub + emergency).
    const shipment = {
      scopeChain: chain(
        ScopeRef.entity('shipment', 's1'),
        ScopeRef.hub('valencia'),
        ScopeRef.emergency('dana'),
        ScopeRef.platform(),
      ),
    };
    // Authority enters via the hub parent, not the emergency.
    await expect(ac.can(ctx, 'shipment:read', shipment)).resolves.toBe(true);
    await expect(ac.can(ctx, 'shipment:track', shipment)).resolves.toBe(true);
    // …but she is nothing in the emergency itself (no hub in that chain).
    const emergencyOnly = {
      scopeChain: chain(ScopeRef.emergency('dana'), ScopeRef.platform()),
    };
    await expect(ac.can(ctx, 'shipment:read', emergencyOnly)).resolves.toBe(
      false,
    );
  });

  it('effectivePermissions returns the union for a scope chain', async () => {
    const ctx = ctxWith(
      Grant.create({
        id: 'g1',
        principalId: PRINCIPAL,
        roleId: 'citizen',
        scope: ScopeRef.platform(),
      }),
    );
    const perms = await ac.effectivePermissions(
      ctx,
      chain(ScopeRef.platform()),
    );
    expect(perms.has('offer:create')).toBe(true);
    expect(perms.has('resource:verify')).toBe(false);
  });
});
