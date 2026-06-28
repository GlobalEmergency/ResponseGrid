import {
  ResourceValidityReport,
  ValidityReason,
  ValidityReportStatus,
} from './resource-validity-report';
import { ValidityReportNotOpenError } from './resource-errors';

const open = (): ResourceValidityReport =>
  ResourceValidityReport.open({
    id: 'r1',
    resourceId: 'res1',
    emergencyId: 'em1',
    reporterUserId: 'user1',
    reason: ValidityReason.Closed,
  });

describe('ResourceValidityReport', () => {
  it('opens with status open and trims a blank note to null', () => {
    const r = ResourceValidityReport.open({
      id: 'r1',
      resourceId: 'res1',
      emergencyId: 'em1',
      reporterUserId: 'u1',
      reason: ValidityReason.Moved,
      note: '   ',
    });
    expect(r.status).toBe(ValidityReportStatus.Open);
    expect(r.note).toBeNull();
    expect(r.photoUrls).toEqual([]);
  });

  it('update refreshes the reason/note while open', () => {
    const r = open();
    r.update({ reason: ValidityReason.Outdated, note: 'horario mal' });
    expect(r.reason).toBe(ValidityReason.Outdated);
    expect(r.note).toBe('horario mal');
  });

  it('accept resolves it and records the coordinator', () => {
    const r = open();
    r.accept('coord-1');
    expect(r.status).toBe(ValidityReportStatus.Accepted);
    expect(r.resolvedByUserId).toBe('coord-1');
    expect(r.resolvedAt).toBeInstanceOf(Date);
  });

  it('dismiss resolves it as dismissed', () => {
    const r = open();
    r.dismiss('coord-1');
    expect(r.status).toBe(ValidityReportStatus.Dismissed);
  });

  it('cannot update or re-resolve a resolved report', () => {
    const r = open();
    r.accept('coord-1');
    expect(() => r.update({ reason: ValidityReason.Closed })).toThrow(
      ValidityReportNotOpenError,
    );
    expect(() => r.dismiss('coord-2')).toThrow(ValidityReportNotOpenError);
  });

  it('round-trips through a snapshot', () => {
    const r = open();
    r.accept('coord-1');
    const back = ResourceValidityReport.fromSnapshot(r.toSnapshot());
    expect(back.status).toBe(ValidityReportStatus.Accepted);
    expect(back.resolvedByUserId).toBe('coord-1');
  });
});
