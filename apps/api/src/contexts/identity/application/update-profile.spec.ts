import { UpdateProfile } from './update-profile';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';

const USER_ID = '11111111-1111-4111-8111-111111111111';

async function buildRepo(): Promise<InMemoryUserRepository> {
  const repo = new InMemoryUserRepository();
  const user = User.create({
    id: UserId.fromString(USER_ID),
    email: Email.fromString('test@reliefhub.org'),
    passwordHash: 'hashed',
    name: 'Original Name',
    isAdmin: false,
    phone: null,
  });
  await repo.save(user);
  return repo;
}

describe('UpdateProfile', () => {
  it('actualiza el teléfono del usuario', async () => {
    const repo = await buildRepo();
    const useCase = new UpdateProfile(repo);

    await useCase.execute({ userId: USER_ID, phone: '+34 600 000 001' });

    const updated = await repo.findById(UserId.fromString(USER_ID));
    expect(updated?.phone).toBe('+34 600 000 001');
    expect(updated?.name).toBe('Original Name');
  });

  it('actualiza el nombre del usuario', async () => {
    const repo = await buildRepo();
    const useCase = new UpdateProfile(repo);

    await useCase.execute({ userId: USER_ID, name: 'Nuevo Nombre' });

    const updated = await repo.findById(UserId.fromString(USER_ID));
    expect(updated?.name).toBe('Nuevo Nombre');
    expect(updated?.phone).toBeNull();
  });

  it('puede poner el teléfono a null (borrar)', async () => {
    const repo = await buildRepo();
    const useCase = new UpdateProfile(repo);
    await useCase.execute({ userId: USER_ID, phone: '+34 600 000 001' });

    await useCase.execute({ userId: USER_ID, phone: null });

    const updated = await repo.findById(UserId.fromString(USER_ID));
    expect(updated?.phone).toBeNull();
  });

  it('lanza si el usuario no existe', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateProfile(repo);

    await expect(
      useCase.execute({
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        phone: '+1 555 0101',
      }),
    ).rejects.toThrow('User not found');
  });
});
