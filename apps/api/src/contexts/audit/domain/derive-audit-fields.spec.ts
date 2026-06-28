import { deriveAuditFields } from './derive-audit-fields';

describe('deriveAuditFields', () => {
  describe('action derivation — verb segment', () => {
    it('POST /resources/:resourceId/verify → resource.verify', () => {
      const r = deriveAuditFields('POST', '/resources/:resourceId/verify', {
        resourceId: 'abc',
      });
      expect(r.action).toBe('resource.verify');
    });

    it('POST /emergencies/:id/pause → emergency.pause', () => {
      const r = deriveAuditFields('POST', '/emergencies/:id/pause', {
        id: 'em1',
      });
      expect(r.action).toBe('emergency.pause');
    });

    it('POST /resources/:resourceId/publish → resource.publish', () => {
      const r = deriveAuditFields('POST', '/resources/:resourceId/publish', {
        resourceId: 'r1',
      });
      expect(r.action).toBe('resource.publish');
    });

    it('POST /needs/:needId/assign → need.assign', () => {
      const r = deriveAuditFields('POST', '/needs/:needId/assign', {
        needId: 'n1',
      });
      expect(r.action).toBe('need.assign');
    });

    it('POST /needs/:needId/validate → need.validate', () => {
      const r = deriveAuditFields('POST', '/needs/:needId/validate', {
        needId: 'n1',
      });
      expect(r.action).toBe('need.validate');
    });

    it('POST /needs/:needId/discard → need.discard', () => {
      const r = deriveAuditFields('POST', '/needs/:needId/discard', {
        needId: 'n1',
      });
      expect(r.action).toBe('need.discard');
    });

    it('POST /reports/:reportId/discard → report.discard', () => {
      const r = deriveAuditFields('POST', '/reports/:reportId/discard', {
        reportId: 'rep1',
      });
      expect(r.action).toBe('report.discard');
    });
  });

  describe('action derivation — CRUD fallback', () => {
    it('POST /emergencies/:emergencyId/resources → resource.create', () => {
      const r = deriveAuditFields(
        'POST',
        '/emergencies/:emergencyId/resources',
        { emergencyId: 'em1' },
      );
      expect(r.action).toBe('resource.create');
    });

    it('POST /auth/register → register.create (last segment is the resource)', () => {
      const r = deriveAuditFields('POST', '/auth/register', {});
      expect(r.action).toBe('register.create');
    });

    it('DELETE /resources/:resourceId → resource.delete', () => {
      const r = deriveAuditFields('DELETE', '/resources/:resourceId', {
        resourceId: 'r1',
      });
      expect(r.action).toBe('resource.delete');
    });

    it('PATCH /needs/:needId → need.update', () => {
      const r = deriveAuditFields('PATCH', '/needs/:needId', { needId: 'n1' });
      expect(r.action).toBe('need.update');
    });

    it('POST /emergencies → emergency.create', () => {
      const r = deriveAuditFields('POST', '/emergencies', {});
      expect(r.action).toBe('emergency.create');
    });
  });

  describe('entityType / entityId', () => {
    it('extracts resourceId from params', () => {
      const r = deriveAuditFields('POST', '/resources/:resourceId/verify', {
        resourceId: 'r-uuid',
      });
      expect(r.entityType).toBe('resource');
      expect(r.entityId).toBe('r-uuid');
    });

    it('extracts needId from params', () => {
      const r = deriveAuditFields('DELETE', '/needs/:needId', {
        needId: 'n-uuid',
      });
      expect(r.entityType).toBe('need');
      expect(r.entityId).toBe('n-uuid');
    });

    it('extracts emergencyId when it is the only param', () => {
      const r = deriveAuditFields('POST', '/emergencies/:emergencyId/pause', {
        emergencyId: 'em-uuid',
      });
      expect(r.entityType).toBe('emergency');
      expect(r.entityId).toBe('em-uuid');
    });

    it('prefers resourceId over emergencyId when both are present', () => {
      const r = deriveAuditFields(
        'POST',
        '/emergencies/:emergencyId/resources/:resourceId/verify',
        { emergencyId: 'em-uuid', resourceId: 'r-uuid' },
      );
      expect(r.entityType).toBe('resource');
      expect(r.entityId).toBe('r-uuid');
    });

    it('returns null entityType when no known param key is present', () => {
      const r = deriveAuditFields('POST', '/auth/login', {});
      expect(r.entityType).toBeNull();
      expect(r.entityId).toBeNull();
    });
  });

  describe('emergencyId', () => {
    it('propagates emergencyId from params', () => {
      const r = deriveAuditFields(
        'POST',
        '/emergencies/:emergencyId/resources',
        { emergencyId: 'em-uuid' },
      );
      expect(r.emergencyId).toBe('em-uuid');
    });

    it('is null when emergencyId not in params', () => {
      const r = deriveAuditFields('POST', '/auth/login', {});
      expect(r.emergencyId).toBeNull();
    });
  });
});
