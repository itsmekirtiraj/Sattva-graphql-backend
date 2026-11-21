import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { CreateUserInput } from './dto/create-user.input';
import { PaginatedUsers } from './dto/paginated-users.type';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
@UseGuards(RolesGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { description: 'Return the currently authenticated user' })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<User> {
    return this.usersService.findById(currentUser.id);
  }

  @Query(() => User, { description: 'Find a user by ID' })
  @Roles(UserRole.ADMIN)
  async user(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Query(() => PaginatedUsers, { description: 'List users with pagination' })
  @Roles(UserRole.ADMIN)
  async users(@Args() pagination: PaginationArgs): Promise<PaginatedUsers> {
    return this.usersService.findAll(pagination.offset, pagination.limit);
  }

  @Mutation(() => User, { description: 'Create a new user (Admin only)' })
  @Roles(UserRole.ADMIN)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  @Mutation(() => User, { description: 'Update user profile' })
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<User> {
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean, { description: 'Delete a user (Admin only)' })
  @Roles(UserRole.ADMIN)
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.usersService.delete(id);
  }
}

