import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/decorators/roles.decorator';
import { InMemoryUsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(new InMemoryUsersRepository());
  });

  it('should create a user and never expose passwordHash', async () => {
    const created = await service.create({
      email: 'alice@example.com',
      name: 'Alice',
      password: 'strongpassword1',
      role: UserRole.USER,
    });

    expect(created.id).toBeDefined();
    expect(created.email).toBe('alice@example.com');
    expect((created as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('should throw ConflictException on duplicate email', async () => {
    await service.create({
      email: 'dup@example.com',
      name: 'First',
      password: 'strongpassword1',
    });

    await expect(
      service.create({
        email: 'DUP@example.com',
        name: 'Second',
        password: 'strongpassword1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    await expect(service.findById('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update and delete an existing user', async () => {
    const created = await service.create({
      email: 'bob@example.com',
      name: 'Bob',
      password: 'strongpassword1',
    });

    const updated = await service.update(created.id, { name: 'Robert' });
    expect(updated.name).toBe('Robert');

    await expect(service.delete(created.id)).resolves.toBe(true);
    await expect(service.findById(created.id)).rejects.toThrow(NotFoundException);
  });
});

