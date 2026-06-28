import { TransportCapacityRepository } from '../domain/ports/transport-capacity.repository';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { CapacityNotFoundError } from './capacity-not-found.error';

export interface WithdrawCapacityCommand {
  capacityId: string;
}

export class WithdrawCapacity {
  constructor(private readonly repo: TransportCapacityRepository) {}

  async execute(cmd: WithdrawCapacityCommand): Promise<void> {
    const capacity = await this.repo.findById(
      TransportCapacityId.fromString(cmd.capacityId),
    );
    if (capacity === null) {
      throw new CapacityNotFoundError(cmd.capacityId);
    }
    capacity.withdraw();
    await this.repo.save(capacity);
  }
}
