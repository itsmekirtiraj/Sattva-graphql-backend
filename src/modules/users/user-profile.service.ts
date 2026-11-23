import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpsertUserProfileInput } from './dto/upsert-user-profile.input';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  async upsert(
    userId: string,
    input: UpsertUserProfileInput,
  ): Promise<UserProfile> {
    const userExists = await this.usersRepository.exists({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }

    const { markOnboardingCompleted, ...fields } = input;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        (profile as unknown as Record<string, unknown>)[key] = value;
      }
    }

    if (markOnboardingCompleted && !profile.onboardingCompletedAt) {
      profile.onboardingCompletedAt = new Date();
    }

    return this.profileRepository.save(profile);
  }

  async completeOnboarding(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'User profile not found. Please create a profile first.',
      );
    }

    if (!profile.onboardingCompletedAt) {
      profile.onboardingCompletedAt = new Date();
      return this.profileRepository.save(profile);
    }

    return profile;
  }
}
