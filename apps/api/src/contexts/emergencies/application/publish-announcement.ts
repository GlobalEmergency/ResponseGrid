import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { EmergencyNotFoundError } from './emergency-not-found.error';

export interface PublishAnnouncementCommand {
  emergencyId: string;
  message: string;
}

export class PublishAnnouncement {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(cmd: PublishAnnouncementCommand): Promise<void> {
    const id = EmergencyId.fromString(cmd.emergencyId);
    const emergency = await this.repo.findById(id);
    if (!emergency) throw new EmergencyNotFoundError(cmd.emergencyId);
    emergency.publishAnnouncement(cmd.message);
    await this.repo.save(emergency);
  }
}
