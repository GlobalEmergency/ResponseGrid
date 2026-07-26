import { MetricsReader } from '../domain/ports/metrics-reader';
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
  constructor(private readonly metricsReader: MetricsReader) {}

  async execute(query: GetEmergencyMetricsQuery): Promise<EmergencyMetrics> {
    // Validate UUID format; the reader works with the raw string id.
    EmergencyId.fromString(query.emergencyId);

    const [needCounts, resourceCounts] = await Promise.all([
      this.metricsReader.countNeedsByEmergencyGroupedByStatus(
        query.emergencyId,
      ),
      this.metricsReader.countResourcesByEmergencyGroupedByPublicStatus(
        query.emergencyId,
      ),
    ]);

    const needTotal =
      needCounts[NeedStatus.Pending] +
      needCounts[NeedStatus.Validated] +
      needCounts[NeedStatus.Rejected] +
      needCounts[NeedStatus.Fulfilled];

    const needOpen =
      needCounts[NeedStatus.Pending] + needCounts[NeedStatus.Validated];
    const needClosed = needCounts[NeedStatus.Fulfilled];

    // Sum across every public status (robust to new statuses being added).
    const resourceTotal = Object.values(resourceCounts).reduce(
      (sum, n) => sum + (n ?? 0),
      0,
    );

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
