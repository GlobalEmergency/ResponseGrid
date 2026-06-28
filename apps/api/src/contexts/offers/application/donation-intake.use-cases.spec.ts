import {
  CreateDonationIntake,
  CreateDonationIntakeCommand,
} from './create-donation-intake';
import { InMemoryDonationIntakeRepository } from '../infrastructure/in-memory-donation-intake.repository';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  IntakeResourceLookup,
  IntakeResourceInfo,
} from '../domain/ports/intake-resource-lookup';
import { Category } from '../domain/offer-enums';
import { DonationIntakeStatus } from '../domain/donation-intake-enums';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { InvalidIntakeTargetResourceError } from '../domain/donation-intake-errors';
import { LookupDonorByContact } from './lookup-donor-by-contact';
import { UpdateDonationIntake } from './update-donation-intake';
import { SearchDonationIntakes } from './search-donation-intakes';
import { ListPendingIntakesByResource } from './list-pending-intakes-by-resource';
import { ConfirmIntakeReception } from './confirm-intake-reception';
import { RejectIntake } from './reject-intake';
import { MarkIntakeIncomplete } from './mark-intake-incomplete';
import {
  DonationIntakeContactMismatchError,
  DonationIntakeAlreadyProcessedError,
} from '../domain/donation-intake-errors';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { DonationIntakeId } from '../domain/donation-intake-id';
import { GetIntakeDeepLink } from './get-intake-deep-link';
import { IntakeQrEncoder } from '../domain/ports/intake-qr-encoder';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '33333333-3333-4333-8333-333333333331';

class FakeStatusReader implements OfferEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

class FakeResourceLookup implements IntakeResourceLookup {
  constructor(private readonly resource: IntakeResourceInfo | null) {}
  findForIntake(_resourceId: string): Promise<IntakeResourceInfo | null> {
    return Promise.resolve(this.resource);
  }
}

class FakeQrEncoder implements IntakeQrEncoder {
  encodeToPng(url: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from(`qr:${url}`));
  }
}

const validResource: IntakeResourceInfo = {
  id: RESOURCE,
  emergencyId: EM,
  emergencySlug: 'mexico-demo',
  name: 'Acopio CDMX Norte',
  type: 'collection_point',
  publicStatus: 'active',
};

function makeCmd(
  overrides?: Partial<CreateDonationIntakeCommand>,
): CreateDonationIntakeCommand {
  return {
    emergencyId: EM,
    targetResourceId: RESOURCE,
    donorName: 'María López',
    donorPhone: '+52 55 1234 5678',
    donorEmail: null,
    donorUserId: null,
    items: [
      {
        category: Category.Food,
        name: 'Arroz 1kg',
        quantity: 10,
        unit: 'bolsas',
        presentation: null,
      },
    ],
    ...overrides,
  };
}

describe('DonationIntake use cases', () => {
  let repo: InMemoryDonationIntakeRepository;
  let create: CreateDonationIntake;

  beforeEach(() => {
    repo = new InMemoryDonationIntakeRepository();
    create = new CreateDonationIntake(
      repo,
      new FakeStatusReader('active'),
      new FakeResourceLookup(validResource),
    );
  });

  describe('CreateDonationIntake', () => {
    it('creates intake with code and pending status', async () => {
      const result = await create.execute(makeCmd());
      expect(result.intakeCode).toMatch(/^ACO-[A-Z2-9]{4}$/);
      expect(result.status).toBe(DonationIntakeStatus.Pending);

      const saved = await repo.findById(DonationIntakeId.fromString(result.id));
      expect(saved).not.toBeNull();
      expect(saved!.lines).toHaveLength(1);
    });

    it('throws when emergency is not active', async () => {
      const uc = new CreateDonationIntake(
        repo,
        new FakeStatusReader('paused'),
        new FakeResourceLookup(validResource),
      );
      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });

    it('throws when resource is not a collection point', async () => {
      const uc = new CreateDonationIntake(
        repo,
        new FakeStatusReader('active'),
        new FakeResourceLookup({
          ...validResource,
          type: 'warehouse',
        }),
      );
      await expect(uc.execute(makeCmd())).rejects.toThrow(
        InvalidIntakeTargetResourceError,
      );
    });
  });

  describe('LookupDonorByContact', () => {
    it('returns latest name and pending intakes for contact', async () => {
      const created = await create.execute(makeCmd());
      const lookup = new LookupDonorByContact(repo);
      const result = await lookup.execute({
        emergencyId: EM,
        donorPhone: '+52 55 1234 5678',
        donorEmail: null,
      });
      expect(result.donorName).toBe('María López');
      expect(result.pendingIntakes).toHaveLength(1);
      expect(result.pendingIntakes[0]?.id).toBe(created.id);
    });
  });

  describe('UpdateDonationIntake', () => {
    it('updates pending intake when code and contact match', async () => {
      const created = await create.execute(makeCmd());
      const saved = await repo.findById(
        DonationIntakeId.fromString(created.id),
      );
      const update = new UpdateDonationIntake(repo);
      await update.execute({
        intakeId: created.id,
        intakeCode: created.intakeCode,
        donorName: 'María Actualizada',
        donorPhone: '+52 55 1234 5678',
        donorEmail: 'maria@test.com',
        items: [
          {
            category: Category.Water,
            name: 'Agua',
            quantity: 3,
            unit: null,
            presentation: null,
          },
        ],
      });
      const updated = await repo.findById(
        DonationIntakeId.fromString(created.id),
      );
      expect(updated!.donorName).toBe('María Actualizada');
      expect(updated!.lines).toHaveLength(1);
      expect(saved!.intakeCode).toBe(created.intakeCode);
    });

    it('throws when contact does not match', async () => {
      const created = await create.execute(makeCmd());
      const update = new UpdateDonationIntake(repo);
      await expect(
        update.execute({
          intakeId: created.id,
          intakeCode: created.intakeCode,
          donorName: 'Otro',
          donorPhone: '999',
          donorEmail: null,
          items: makeCmd().items,
        }),
      ).rejects.toThrow(DonationIntakeContactMismatchError);
    });
  });

  describe('SearchDonationIntakes', () => {
    it('finds by phone partial and intake code', async () => {
      const created = await create.execute(makeCmd());
      const search = new SearchDonationIntakes(repo);
      const byPhone = await search.execute({
        emergencyId: EM,
        query: '1234',
      });
      expect(byPhone.some((h) => h.id === created.id)).toBe(true);

      const byCode = await search.execute({
        emergencyId: EM,
        query: created.intakeCode,
      });
      expect(byCode).toHaveLength(1);
    });
  });

  describe('ListPendingIntakesByResource', () => {
    it('lists pending intakes for resource ordered oldest first', async () => {
      await create.execute(makeCmd());
      const list = new ListPendingIntakesByResource(repo);
      const pending = await list.execute(RESOURCE);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.status).toBe(DonationIntakeStatus.Pending);
    });
  });

  describe('reception actions', () => {
    it('confirm, reject, and incomplete transition from pending', async () => {
      const created = await create.execute(makeCmd());
      const bus = new FakeOfferEventBus();
      const confirm = new ConfirmIntakeReception(repo, bus);
      await confirm.execute({
        intakeId: created.id,
        receivedByUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        volunteerNotes: 'OK',
        evidenceFileKey: 'photo.jpg',
      });
      expect(bus.published).toHaveLength(1);
      expect(bus.published[0]?.eventName).toBe('donation_intake.received');
      let saved = await repo.findById(DonationIntakeId.fromString(created.id));
      expect(saved!.status).toBe(DonationIntakeStatus.Received);

      const created2 = await create.execute(
        makeCmd({ donorPhone: '+52 55 9999 0000' }),
      );
      const reject = new RejectIntake(repo);
      await reject.execute({
        intakeId: created2.id,
        volunteerNotes: 'No permitido',
      });
      saved = await repo.findById(DonationIntakeId.fromString(created2.id));
      expect(saved!.status).toBe(DonationIntakeStatus.Rejected);

      const created3 = await create.execute(
        makeCmd({ donorPhone: '+52 55 8888 0000' }),
      );
      const incomplete = new MarkIntakeIncomplete(repo);
      await incomplete.execute({
        intakeId: created3.id,
        volunteerNotes: 'Faltó material',
      });
      saved = await repo.findById(DonationIntakeId.fromString(created3.id));
      expect(saved!.status).toBe(DonationIntakeStatus.Incomplete);
    });

    it('cannot confirm twice', async () => {
      const created = await create.execute(makeCmd());
      const confirm = new ConfirmIntakeReception(repo, new FakeOfferEventBus());
      await confirm.execute({
        intakeId: created.id,
        receivedByUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        volunteerNotes: null,
        evidenceFileKey: null,
      });
      const saved = await repo.findById(
        DonationIntakeId.fromString(created.id),
      );
      expect(() => saved!.confirmReception('vol-2', null, null)).toThrow(
        DonationIntakeAlreadyProcessedError,
      );
    });
  });

  describe('GetIntakeDeepLink', () => {
    it('builds the canonical donar-acopio URL for a published collection point', async () => {
      const uc = new GetIntakeDeepLink(
        new FakeResourceLookup(validResource),
        'http://localhost:3001',
        new FakeQrEncoder(),
      );

      const result = await uc.execute(RESOURCE);

      expect(result).toEqual({
        url: `http://localhost:3001/e/mexico-demo/donar-acopio?resourceId=${RESOURCE}`,
        resourceName: 'Acopio CDMX Norte',
        slug: 'mexico-demo',
        resourceId: RESOURCE,
      });
    });

    it('rejects a non-collection resource', async () => {
      const uc = new GetIntakeDeepLink(
        new FakeResourceLookup({ ...validResource, type: 'delivery_point' }),
        'http://localhost:3001',
        new FakeQrEncoder(),
      );

      await expect(uc.execute(RESOURCE)).rejects.toBeInstanceOf(
        InvalidIntakeTargetResourceError,
      );
    });

    it('generates QR bytes from the deep link URL', async () => {
      const uc = new GetIntakeDeepLink(
        new FakeResourceLookup(validResource),
        'http://localhost:3001',
        new FakeQrEncoder(),
      );

      const png = await uc.generateQr(RESOURCE);

      expect(png.toString()).toBe(
        `qr:http://localhost:3001/e/mexico-demo/donar-acopio?resourceId=${RESOURCE}`,
      );
    });
  });
});
