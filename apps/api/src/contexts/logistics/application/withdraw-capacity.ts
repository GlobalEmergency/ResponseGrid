import { TransportCapacityRepository } from '../domain/ports/transport-capacity.repository';
import { TransportCapacityId } from '../domain/transport-capacity-id';
import { CapacityNotFoundError } from './capacity-not-found.error';

export class CapacityWithdrawUnauthorizedError extends Error {
  constructor() {
    super(
      'Only the capacity provider or a coordinator can withdraw a capacity',
    );
    this.name = 'CapacityWithdrawUnauthorizedError';
  }
}

export interface WithdrawCapacityCommand {
  capacityId: string;
  /** The authenticated user id (the volunteer provider, when self-service). */
  requesterUserId: string;
  /** True when the requester is an admin or coordinator of the emergency. */
  isCoordinator: boolean;
}

export class WithdrawCapacity {
  constructor(private readonly repo: TransportCapacityRepository) {}

  async execute(cmd: WithdrawCapacityCommand): Promise<void> {
    const capacity = await this.repo.findById(
      TransportCapacityId.fromString(cmd.capacityId),
    );
    if (!capacity) throw new CapacityNotFoundError(cmd.capacityId);

    const isOwner = capacity.provider.id === cmd.requesterUserId;
    if (!cmd.isCoordinator && !isOwner) {
      throw new CapacityWithdrawUnauthorizedError();
    }

    capacity.withdraw();
    await this.repo.save(capacity);
  }
}
