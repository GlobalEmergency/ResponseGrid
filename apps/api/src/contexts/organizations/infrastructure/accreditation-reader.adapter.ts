import { AccreditationRepository } from '../../accreditation/domain/ports/accreditation.repository';
import {
  AccreditationReader,
  OrganizationAccreditation,
} from '../domain/ports/accreditation-reader';

/**
 * Adapts the accreditation context's repository to the organizations context's
 * {@link AccreditationReader} output port (anti-corruption / DIP). The
 * application depends on the port; this adapter is wired in the module.
 */
export class AccreditationReaderAdapter implements AccreditationReader {
  constructor(private readonly repo: AccreditationRepository) {}

  async listForOrganization(
    organizationId: string,
  ): Promise<OrganizationAccreditation[]> {
    const accreditations = await this.repo.list({ organizationId });
    return accreditations.map((a) => {
      const scope = a.scope.toPlain();
      return {
        id: a.id,
        scope:
          scope.kind === 'global'
            ? 'global'
            : { emergencyId: scope.emergencyId },
        grantedByUserId: a.grantedByUserId,
        grantedAt: a.grantedAt.toISOString(),
        evidence: a.evidence,
      };
    });
  }
}
