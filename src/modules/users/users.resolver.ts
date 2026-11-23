import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UserProfileService } from './user-profile.service';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Query(() => User, { description: 'Get the currently authenticated user' })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<User> {
    return this.usersService.findById(currentUser.id);
  }

  @ResolveField(() => UserProfile, {
    nullable: true,
    description: 'User profile details',
  })
  async profile(@Parent() user: User): Promise<UserProfile | null> {
    return this.userProfileService.findByUserId(user.id);
  }
}
