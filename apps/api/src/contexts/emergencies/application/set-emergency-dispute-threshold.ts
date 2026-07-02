import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotFoundError } from './emergency-not-found.error';

export interface SetEmergencyDisputeThresholdCommand {
  emergencyId: string;
  threshold: number | null;
}

export class SetEmergencyDisputeThreshold {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: SetEmergencyDisputeThresholdCommand): Promise<void> {
    const id = EmergencyId.fromString(cmd.emergencyId);
    const emergency = await this.repo.findById(id);
    if (!emergency) throw new EmergencyNotFoundError(cmd.emergencyId);
    emergency.setResourceDisputeThreshold(cmd.threshold);
    await this.repo.save(emergency);
  }
}
