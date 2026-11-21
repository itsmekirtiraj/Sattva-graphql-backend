import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { User } from '../../modules/users/entities/user.entity';
import { UsersService } from '../../modules/users/users.service';
import { AppLoaders } from './dataloader.types';

@Injectable()
export class DataloadersService {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates fresh DataLoader instances per GraphQL request to ensure
   * request-scoped batching and prevent cross-request cache leakage.
   */
  createLoaders(): AppLoaders {
    return {
      userByIdLoader: new DataLoader<string, User | null>(async (ids) => {
        const users = await this.usersService.findByIds(ids);
        const userMap = new Map(users.map((user) => [user.id, user]));
        return ids.map((id) => userMap.get(id) ?? null);
      }),
    };
  }
}

