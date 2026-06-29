import { DonationIntakeRepository } from '../domain/ports/donation-intake.repository';

export interface IncomingSummaryLine {
  name: string;
  category: string;
  unit: string | null;
  presentation: string | null;
  /** Total quantity expected across all pending intakes for this line. */
  totalQuantity: number;
  /** How many distinct pending intakes contribute to this line. */
  intakeCount: number;
}

export interface IncomingSummary {
  lines: IncomingSummaryLine[];
  totalPendingIntakes: number;
}

/**
 * Forecast of incoming material for a collection point: aggregates the lines of
 * all PENDING (pre-registered, not-yet-received) donation intakes for the point,
 * grouping by (name + category + unit + presentation) and summing quantities, so
 * the operator can plan ("por entrar: 200 L agua, 30 cajas higiene"). This is
 * the *expected* view — distinct from #9's record of entries that have arrived.
 */
export class GetIncomingSummaryByResource {
  constructor(private readonly repo: DonationIntakeRepository) {}

  async execute(resourceId: string): Promise<IncomingSummary> {
    const intakes = await this.repo.findPendingByResource(resourceId);

    const byKey = new Map<string, IncomingSummaryLine>();
    for (const intake of intakes) {
      const seenInThisIntake = new Set<string>();
      for (const line of intake.lines) {
        const sl = line.supplyLine;
        const key = JSON.stringify([
          sl.name,
          sl.category,
          sl.unit,
          sl.presentation,
        ]);
        let agg = byKey.get(key);
        if (!agg) {
          agg = {
            name: sl.name,
            category: sl.category,
            unit: sl.unit,
            presentation: sl.presentation,
            totalQuantity: 0,
            intakeCount: 0,
          };
          byKey.set(key, agg);
        }
        agg.totalQuantity += sl.quantity;
        if (!seenInThisIntake.has(key)) {
          agg.intakeCount += 1;
          seenInThisIntake.add(key);
        }
      }
    }

    return {
      lines: [...byKey.values()],
      totalPendingIntakes: intakes.length,
    };
  }
}
