import { Module } from '@nestjs/common';
import {
  InMemoryUsersRepository,
  UsersRepository,
} from './repositories/users.repository';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  providers: [
    UsersResolver,
    UsersService,
    {
      provide: UsersRepository,
      useClass: InMemoryUsersRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}

