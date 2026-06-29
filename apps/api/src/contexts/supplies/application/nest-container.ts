import { ContainerRepository } from '../domain/ports/container.repository';
import { Container } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import {
  ContainerCycleError,
  ContainerEmergencyMismatchError,
} from '../domain/container-errors';
import { ContainerNotFoundError } from './container-not-found.error';

export interface NestContainerCommand {
  containerId: string;
  /** New parent, or `null` to un-nest (make it top-level). */
  parentContainerId: string | null;
}

/**
 * Nests a container under a parent (or un-nests it when `parentContainerId` is
 * null). Enforces the cross-aggregate invariants the aggregate cannot see on
 * its own: same emergency, and no cycle — walking up from the proposed parent,
 * we must never reach the child.
 */
export class NestContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: NestContainerCommand): Promise<void> {
    const child = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!child) throw new ContainerNotFoundError(cmd.containerId);

    if (cmd.parentContainerId === null) {
      child.setParent(null);
      await this.repo.save(child);
      return;
    }

    const parentId = ContainerId.fromString(cmd.parentContainerId);
    const parent = await this.repo.findById(parentId);
    if (!parent) throw new ContainerNotFoundError(cmd.parentContainerId);

    if (!parent.emergencyId.equals(child.emergencyId)) {
      throw new ContainerEmergencyMismatchError(
        'A container and its parent must belong to the same emergency',
      );
    }

    await this.assertNoCycle(child, parent);

    child.setParent(parentId);
    await this.repo.save(child);
  }

  /** Walks ancestors of `parent`; reaching `child` would close a cycle. */
  private async assertNoCycle(
    child: Container,
    parent: Container,
  ): Promise<void> {
    let cursor: Container | null = parent;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor.id.equals(child.id)) {
        throw new ContainerCycleError(
          `Nesting ${child.id.value} under ${parent.id.value} would create a cycle`,
        );
      }
      if (seen.has(cursor.id.value)) break;
      seen.add(cursor.id.value);
      const parentRef: ContainerId | null = cursor.parentContainerId;
      cursor = parentRef ? await this.repo.findById(parentRef) : null;
    }
  }
}
