import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { UpsertUserProfileInput } from './dto/upsert-user-profile.input';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileService } from './user-profile.service';

@Resolver(() => UserProfile)
export class UserProfileResolver {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Query(() => UserProfile, {
    nullable: true,
    description: 'Get the currently authenticated user profile',
  })
  async myProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserProfile | null> {
    return this.userProfileService.findByUserId(currentUser.id);
  }

  @Mutation(() => UserProfile, {
    description: 'Create or update the currently authenticated user profile',
  })
  async upsertMyProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Args('input') input: UpsertUserProfileInput,
  ): Promise<UserProfile> {
    return this.userProfileService.upsert(currentUser.id, input);
  }

  @Mutation(() => UserProfile, {
    description: 'Mark onboarding as completed for the current user',
  })
  async completeOnboarding(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserProfile> {
    return this.userProfileService.completeOnboarding(currentUser.id);
  }
}
