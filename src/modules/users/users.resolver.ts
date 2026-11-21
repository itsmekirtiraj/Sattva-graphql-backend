import { Query, Resolver } from '@nestjs/graphql';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { description: 'Get the currently authenticated user' })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<User> {
    return this.usersService.findById(currentUser.id);
  }
}
