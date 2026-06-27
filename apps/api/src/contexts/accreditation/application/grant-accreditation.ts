import { randomUUID } from 'node:crypto';
import {
  AccreditationRepository,
  ACCREDITATION_REPOSITORY,
} from '../domain/ports/accreditation.repository';
import { Accreditation } from '../domain/accreditation';
import { AccreditationScope } from '../domain/value-objects/accreditation-scope';

export type GrantAccreditationScope = 'global' | { emergencyId: string };

export interface GrantAccreditationCommand {
  organizationId: string;
  scope: GrantAccreditationScope;
  grantedByUserId: string;
  evidence?: string | null;
}

export { ACCREDITATION_REPOSITORY };

export class AccreditationAlreadyExistsError extends Error {
  constructor(organizationId: string, scope: string) {
    super(
      `Organization '${organizationId}' already has an active accreditation for scope '${scope}'`,
    );
    this.name = 'AccreditationAlreadyExistsError';
  }
}

export class GrantAccreditation {
  constructor(private readonly repo: AccreditationRepository) {}

  async execute(cmd: GrantAccreditationCommand): Promise<{ id: string }> {
    const scope =
      cmd.scope === 'global'
        ? AccreditationScope.global()
        : AccreditationScope.forEmergency(cmd.scope.emergencyId);

    // Reject duplicate: an org may only hold one accreditation per scope.
    // Global scope is unique on its own; emergency scope is unique per emergencyId.
    const existing = await this.repo.list({
      organizationId: cmd.organizationId,
    });
    const duplicate = existing.find((a) => {
      if (scope.isGlobal) return a.scope.isGlobal;
      return !a.scope.isGlobal && a.scope.emergencyId === scope.emergencyId;
    });
    if (duplicate) {
      const scopeLabel = scope.isGlobal
        ? 'global'
        : `emergency:${scope.emergencyId}`;
      throw new AccreditationAlreadyExistsError(cmd.organizationId, scopeLabel);
    }

    const accreditation = Accreditation.grant({
      id: randomUUID(),
      organizationId: cmd.organizationId,
      scope,
      grantedByUserId: cmd.grantedByUserId,
      evidence: cmd.evidence ?? null,
    });

    await this.repo.save(accreditation);
    return { id: accreditation.id };
  }
}
