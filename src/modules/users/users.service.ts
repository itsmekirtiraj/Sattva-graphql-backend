import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRoleEntity } from './entities/user-role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserRoleEntity)
    private readonly userRolesRepository: Repository<UserRoleEntity>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async findByIds(ids: readonly string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.usersRepository.findBy({ id: In([...ids]) });
  }

  async findByPhone(
    phoneCountryCode: string,
    phoneNumber: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phoneCountryCode, phoneNumber },
    });
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    const userRoles = await this.userRolesRepository.find({
      where: { userId },
      relations: { role: true },
    });
    return userRoles
      .map((ur) => ur.role?.code)
      .filter((code): code is string => Boolean(code));
  }
}
