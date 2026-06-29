import { ContainerRepository } from '../domain/ports/container.repository';
import { Container } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import {
  addOptionalAmounts,
  ContainerTreeView,
  toContainerView,
} from './container-view';
import { ContainerNotFoundError } from './container-not-found.error';

export interface GetContainerCommand {
  containerId: string;
}

/**
 * Reads a container as a tree: its direct children (recursively) plus the
 * aggregated weight/volume (own + Σ children). The composition is stored by
 * reference, so the tree is assembled here in the read model.
 */
export class GetContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: GetContainerCommand): Promise<ContainerTreeView> {
    const root = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!root) throw new ContainerNotFoundError(cmd.containerId);
    return this.buildTree(root, new Set<string>());
  }

  private async buildTree(
    container: Container,
    seen: Set<string>,
  ): Promise<ContainerTreeView> {
    seen.add(container.id.value);
    const view = toContainerView(container);

    let totalWeightKg = container.grossWeightKg;
    let totalVolumeM3 = container.grossVolumeM3;
    const children: ContainerTreeView[] = [];

    for (const child of await this.repo.findChildren(container.id)) {
      // Defensive: the Nest use case prevents cycles, but never loop forever.
      if (seen.has(child.id.value)) continue;
      const subtree = await this.buildTree(child, seen);
      children.push(subtree);
      totalWeightKg = addOptionalAmounts(totalWeightKg, subtree.totalWeightKg);
      totalVolumeM3 = addOptionalAmounts(totalVolumeM3, subtree.totalVolumeM3);
    }

    return { ...view, children, totalWeightKg, totalVolumeM3 };
  }
}
