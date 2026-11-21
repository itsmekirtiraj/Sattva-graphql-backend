import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserRole } from '../../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../../common/pagination/paginated.type';
import { hashPassword } from '../../../common/utils/password.util';
import { User, UserRecord } from '../entities/user.entity';

export interface CreateUserRecordData {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

export abstract class UsersRepository {
  abstract findById(id: string): Promise<UserRecord | null>;
  abstract findByIds(ids: readonly string[]): Promise<UserRecord[]>;
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findAll(offset: number, limit: number): Promise<PaginatedResult<User>>;
  abstract create(data: CreateUserRecordData): Promise<UserRecord>;
  abstract update(id: string, data: Partial<Pick<UserRecord, 'name'>>): Promise<UserRecord | null>;
  abstract delete(id: string): Promise<boolean>;
}

@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  private readonly store = new Map<string, UserRecord>();

  constructor() {
    super();
    this.seedDefaults();
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findByIds(ids: readonly string[]): Promise<UserRecord[]> {
    const results: UserRecord[] = [];
    for (const id of ids) {
      const user = this.store.get(id);
      if (user) {
        results.push(user);
      }
    }
    return results;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.store.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  async findAll(offset: number, limit: number): Promise<PaginatedResult<User>> {
    const all = Array.from(this.store.values()).map((record) =>
      this.toPublicUser(record),
    );
    const items = all.slice(offset, offset + limit);
    return {
      items,
      total: all.length,
      hasMore: offset + items.length < all.length,
    };
  }

  async create(data: CreateUserRecordData): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: randomUUID(),
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      role: data.role,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(record.id, record);
    return record;
  }

  async update(
    id: string,
    data: Partial<Pick<UserRecord, 'name'>>,
  ): Promise<UserRecord | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }
    const updated: UserRecord = {
      ...existing,
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  private toPublicUser(record: UserRecord): User {
    const { passwordHash: _passwordHash, ...user } = record;
    return user;
  }

  private seedDefaults(): void {
    const now = new Date();
    const admin: UserRecord = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      passwordHash: hashPassword('admin1234'),
      createdAt: now,
      updatedAt: now,
    };
    const member: UserRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'member@example.com',
      name: 'Jane Doe',
      role: UserRole.USER,
      passwordHash: hashPassword('member1234'),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(admin.id, admin);
    this.store.set(member.id, member);
  }
}
