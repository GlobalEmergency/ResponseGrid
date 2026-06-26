import { NeedRepository } from '../../needs/domain/ports/need.repository';
import { ResourceRepository } from '../../resources/domain/ports/resource.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { NeedStatus } from '../../needs/domain/need-enums';
import { PublicStatus } from '../../resources/domain/resource-enums';

export interface GetEmergencyMetricsQuery {
  emergencyId: string;
}

export interface NeedsMetrics {
  total: number;
  /** open = pending + validated */
  open: number;
  /** closed = fulfilled */
  closed: number;
  // NOTE: rejected needs count toward total but not toward open or closed.
}

export interface ResourcesMetrics {
  total: number;
  /** active = publicStatus Active (operative logistic points) */
  active: number;
  /** pending = publicStatus Hidden (awaiting review/publication) */
  pending: number;
}

export interface EmergencyMetrics {
  needs: NeedsMetrics;
  resources: ResourcesMetrics;
}

export class GetEmergencyMetrics {
  constructor(
    private readonly needRepo: NeedRepository,
    private readonly resourceRepo: ResourceRepository,
  ) {}

  async execute(query: GetEmergencyMetricsQuery): Promise<EmergencyMetrics> {
    const emergencyId = EmergencyId.fromString(query.emergencyId);

    const [needCounts, resourceCounts] = await Promise.all([
      this.needRepo.countByEmergencyGroupedByStatus(emergencyId),
      this.resourceRepo.countByEmergencyGroupedByPublicStatus(emergencyId),
    ]);

    const needTotal =
      needCounts[NeedStatus.Pending] +
      needCounts[NeedStatus.Validated] +
      needCounts[NeedStatus.Rejected] +
      needCounts[NeedStatus.Fulfilled];

    const needOpen = needCounts[NeedStatus.Pending] + needCounts[NeedStatus.Validated];
    const needClosed = needCounts[NeedStatus.Fulfilled];

    const resourceTotal =
      resourceCounts[PublicStatus.Hidden] +
      resourceCounts[PublicStatus.Active] +
      resourceCounts[PublicStatus.Saturated] +
      resourceCounts[PublicStatus.Paused] +
      resourceCounts[PublicStatus.Closed];

    return {
      needs: {
        total: needTotal,
        open: needOpen,
        closed: needClosed,
      },
      resources: {
        total: resourceTotal,
        active: resourceCounts[PublicStatus.Active],
        pending: resourceCounts[PublicStatus.Hidden],
      },
    };
  }
}
