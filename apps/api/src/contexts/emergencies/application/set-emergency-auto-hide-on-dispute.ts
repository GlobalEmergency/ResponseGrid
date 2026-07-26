import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotFoundError } from './emergency-not-found.error';

export interface SetEmergencyAutoHideOnDisputeCommand {
  emergencyId: string;
  enabled: boolean;
}

/**
 * Coordinator toggle (#171) for the opt-in auto-hide-on-dispute policy: when
 * enabled, a `ResourceDisputed` handler in the resources context resolves the
 * dispute automatically (same transition as a human "confirm cierre") instead
 * of leaving the point visible with a badge for a human to confirm. Off by
 * default; this use case is the only way to turn it on or off.
 */
export class SetEmergencyAutoHideOnDispute {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: SetEmergencyAutoHideOnDisputeCommand): Promise<void> {
    const id = EmergencyId.fromString(cmd.emergencyId);
    const emergency = await this.repo.findById(id);
    if (!emergency) throw new EmergencyNotFoundError(cmd.emergencyId);
    emergency.setAutoHideOnDispute(cmd.enabled);
    await this.repo.save(emergency);
  }
}
