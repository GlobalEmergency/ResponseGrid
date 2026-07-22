import { NeedResourceNotInEmergencyError } from './need-errors';

describe('NeedResourceNotInEmergencyError', () => {
  it('exposes a stable code for the web to localize (#348), independent of the message prose', () => {
    const error = new NeedResourceNotInEmergencyError('some-resource-id');
    expect(error.code).toBe('resource_not_in_emergency');
    expect(error.message).toBe(
      'Resource some-resource-id does not exist in this emergency',
    );
  });
});
