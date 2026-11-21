import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/pagination/paginated.type';
import { hashPassword } from '../../common/utils/password.util';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User, UserRecord } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const record = await this.usersRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.toPublicUser(record);
  }

  async findByIds(ids: readonly string[]): Promise<User[]> {
    const records = await this.usersRepository.findByIds(ids);
    return records.map((record) => this.toPublicUser(record));
  }

  async findRecordByEmail(email: string): Promise<UserRecord | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findAll(offset: number, limit: number): Promise<PaginatedResult<User>> {
    return this.usersRepository.findAll(offset, limit);
  }

  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException(
        `User with email "${input.email}" already exists`,
      );
    }

    const record = await this.usersRepository.create({
      email: input.email,
      name: input.name,
      passwordHash: hashPassword(input.password),
      role: input.role ?? UserRole.USER,
    });

    return this.toPublicUser(record);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const updated = await this.usersRepository.update(id, {
      name: input.name,
    });
    if (!updated) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.toPublicUser(updated);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.usersRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return true;
  }

  private toPublicUser(record: UserRecord): User {
    const { passwordHash: _passwordHash, ...user } = record;
    return user;
  }
}

