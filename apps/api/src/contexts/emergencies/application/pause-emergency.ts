import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotFoundError } from './emergency-not-found.error';

export interface PauseEmergencyCommand {
  emergencyId: string;
}

export class PauseEmergency {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: PauseEmergencyCommand): Promise<void> {
    const id = EmergencyId.fromString(cmd.emergencyId);
    const emergency = await this.repo.findById(id);
    if (!emergency) throw new EmergencyNotFoundError(cmd.emergencyId);
    emergency.pause();
    await this.repo.save(emergency);
  }
}
