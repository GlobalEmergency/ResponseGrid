import { ScopeRef } from './scope-ref';

describe('ScopeRef', () => {
  describe('equals()', () => {
    it('platform equals platform', () => {
      expect(ScopeRef.platform().equals(ScopeRef.platform())).toBe(true);
    });
    it('same-id emergencies are equal', () => {
      expect(ScopeRef.emergency('e1').equals(ScopeRef.emergency('e1'))).toBe(
        true,
      );
    });
    it('different-id emergencies are not equal', () => {
      expect(ScopeRef.emergency('e1').equals(ScopeRef.emergency('e2'))).toBe(
        false,
      );
    });
    it('different scope types are not equal even with same id', () => {
      expect(ScopeRef.emergency('x').equals(ScopeRef.group('x'))).toBe(false);
    });
    it('entity equality requires both entityType and id', () => {
      expect(
        ScopeRef.entity('shipment', 's1').equals(
          ScopeRef.entity('shipment', 's1'),
        ),
      ).toBe(true);
      expect(
        ScopeRef.entity('shipment', 's1').equals(
          ScopeRef.entity('report', 's1'),
        ),
      ).toBe(false);
    });
  });

  describe('coversAnyOf()', () => {
    it('a platform scope covers any chain, including empty', () => {
      expect(ScopeRef.platform().coversAnyOf([])).toBe(true);
      expect(ScopeRef.platform().coversAnyOf([ScopeRef.emergency('e1')])).toBe(
        true,
      );
    });
    it('an organization scope covers a chain containing that organization', () => {
      const chain = [ScopeRef.emergency('e1'), ScopeRef.organization('o1')];
      expect(ScopeRef.organization('o1').coversAnyOf(chain)).toBe(true);
    });
    it('does not cover a chain without that scope', () => {
      const chain = [ScopeRef.emergency('e2'), ScopeRef.platform()];
      expect(ScopeRef.emergency('e1').coversAnyOf(chain)).toBe(false);
    });
  });

  describe('fromProps() / toPlain()', () => {
    it('round-trips an emergency scope', () => {
      const props = ScopeRef.emergency('e1').toPlain();
      expect(ScopeRef.fromProps(props).equals(ScopeRef.emergency('e1'))).toBe(
        true,
      );
    });
    it('throws on an empty id', () => {
      expect(() => ScopeRef.emergency('')).toThrow();
    });
  });
});
