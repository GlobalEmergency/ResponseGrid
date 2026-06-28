import { ContainerRepository } from '../domain/ports/container.repository';
import { Container, ContainerHolder } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import { ContainerType } from '../domain/container-enums';
import { formatContainerCode } from '../domain/container-code';
import { SupplyLine, SupplyLineProps } from '../domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';

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
    const emergencyId = EmergencyId.fromString(cmd.emergencyId);
    const sequence = await this.repo.nextSequence(emergencyId, cmd.type);
    const code = formatContainerCode(cmd.type, sequence);

    const container = Container.create({
      id: ContainerId.create(),
      code,
      type: cmd.type,
      emergencyId,
      lines: (cmd.lines ?? []).map((l) => SupplyLine.create(l)),
      grossWeightKg: cmd.grossWeightKg ?? null,
      grossVolumeM3: cmd.grossVolumeM3 ?? null,
      holder: cmd.holder ?? null,
    });

    await this.repo.save(container);
    return { id: container.id.value, code: container.code };
  }
}
