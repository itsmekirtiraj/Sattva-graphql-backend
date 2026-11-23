import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { User } from './entities/user.entity';
import { UserProfileResolver } from './user-profile.resolver';
import { UserProfileService } from './user-profile.service';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRoleEntity, UserProfile]),
  ],
  providers: [
    UsersService,
    UsersResolver,
    UserProfileService,
    UserProfileResolver,
  ],
  exports: [UsersService, UserProfileService, TypeOrmModule],
})
export class UsersModule {}
