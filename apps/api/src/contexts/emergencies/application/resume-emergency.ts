import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotFoundError } from './emergency-not-found.error';

export interface ResumeEmergencyCommand {
  emergencyId: string;
}

export class ResumeEmergency {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: ResumeEmergencyCommand): Promise<void> {
    const id = EmergencyId.fromString(cmd.emergencyId);
    const emergency = await this.repo.findById(id);
    if (!emergency) throw new EmergencyNotFoundError(cmd.emergencyId);
    emergency.resume();
    await this.repo.save(emergency);
  }
}
