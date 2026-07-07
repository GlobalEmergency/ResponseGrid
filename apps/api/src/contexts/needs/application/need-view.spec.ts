import { toPublicNeedView, toCoordinatorNeedView } from './need-view';
import { Need } from '../domain/need';
import { NeedId } from '../domain/need-id';
import { SupplyLine } from '@globalemergency/warehouse-core/kernel';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, Category } from '../domain/need-enums';
import { Location } from '../../../shared/domain/location';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';

const EM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const EXACT_ADDRESS = 'Calle Los Rosales #123, Apt 4B, Chacao, Caracas';

function makeNeed(sensitivity: LocationSensitivity): Need {
  return Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title: 'Alimentos',
    description: null,
    location: Location.create({
      address: EXACT_ADDRESS,
      latitude: 10.4806,
      longitude: -66.9036,
    }),
    priority: Priority.High,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    locationSensitivity: sensitivity,
    items: [
      SupplyLine.create({
        name: 'Agua',
        quantity: 10,
        unit: 'litros',
        category: Category.Water,
      }),
    ],
  });
}

describe('toPublicNeedView — location privacy', () => {
  it('coarsens the street address for approximate-sensitivity needs', () => {
    const view = toPublicNeedView(makeNeed(LocationSensitivity.Approximate));
    // The exact street line must NOT be present; only coarse locality remains.
    expect(view.location.address).toBe('Apt 4B, Chacao, Caracas');
    expect(view.location.address).not.toContain('Calle Los Rosales #123');
  });

  it('jitters the coordinates for approximate-sensitivity needs', () => {
    const need = makeNeed(LocationSensitivity.Approximate);
    const view = toPublicNeedView(need);
    const exact = need.location.toPlain();
    // Coordinates are offset (not equal to the exact position).
    expect(view.location.latitude).not.toBe(exact.latitude);
    expect(view.location.longitude).not.toBe(exact.longitude);
  });

  it('keeps the exact address for public-sensitivity needs', () => {
    const view = toPublicNeedView(makeNeed(LocationSensitivity.Public));
    expect(view.location.address).toBe(EXACT_ADDRESS);
  });
});

describe('toCoordinatorNeedView — exact location', () => {
  it('always returns the exact address regardless of sensitivity', () => {
    const view = toCoordinatorNeedView(
      makeNeed(LocationSensitivity.Approximate),
    );
    expect(view.location.address).toBe(EXACT_ADDRESS);
  });
});
