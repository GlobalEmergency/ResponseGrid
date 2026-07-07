import {
  ContainerRepository,
  Container,
  ContainerHolder,
  ContainerId,
  ContainerType,
  formatContainerCode,
} from '@globalemergency/warehouse-core/containers';
import {
  SupplyLine,
  SupplyLineProps,
} from '@globalemergency/warehouse-core/kernel';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';

export interface CreateContainerCommand {
  emergencyId: string;
  type: ContainerType;
  lines?: SupplyLineProps[];
  grossWeightKg?: number | null;
  grossVolumeM3?: number | null;
  holder?: ContainerHolder | null;
}

/**
 * Creates a top-level (parent-less) container with a generated trackable code
 * (`PAL-0001`, sequence per emergency + type). Nesting and holder moves are
 * separate operations; an initial holder/lines may be provided for ergonomics
 * (a box created already filled, at a hub).
 */
export class CreateContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(
    cmd: CreateContainerCommand,
  ): Promise<{ id: string; code: string }> {
    const scopeId = ScopeId.fromString(cmd.emergencyId);
    const sequence = await this.repo.nextSequence(scopeId, cmd.type);
    const code = formatContainerCode(cmd.type, sequence);

    const container = Container.create({
      id: ContainerId.create(),
      code,
      type: cmd.type,
      scopeId,
      lines: (cmd.lines ?? []).map((l) => SupplyLine.create(l)),
      grossWeightKg: cmd.grossWeightKg ?? null,
      grossVolumeM3: cmd.grossVolumeM3 ?? null,
      holder: cmd.holder ?? null,
    });

    await this.repo.save(container);
    return { id: container.id.value, code: container.code };
  }
}
