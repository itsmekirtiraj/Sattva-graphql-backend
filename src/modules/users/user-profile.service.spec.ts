import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { User } from './entities/user.entity';
import { UserGender } from './enums/user-gender.enum';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let profileRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let usersRepo: {
    exists: jest.Mock;
  };

  beforeEach(async () => {
    profileRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => entity),
    };

    usersRepo = {
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: getRepositoryToken(UserProfile), useValue: profileRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  it('throws NotFoundException when user does not exist on upsert', async () => {
    usersRepo.exists.mockResolvedValue(false);

    await expect(
      service.upsert('missing-user', { firstName: 'Aarav' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a new profile and marks onboarding completed when requested', async () => {
    usersRepo.exists.mockResolvedValue(true);
    profileRepo.findOne.mockResolvedValue(null);

    const saved = await service.upsert('user-1', {
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: UserGender.MALE,
      dateOfBirth: '1997-05-10',
      markOnboardingCompleted: true,
    });

    expect(saved.userId).toBe('user-1');
    expect(saved.firstName).toBe('Aarav');
    expect(saved.gender).toBe(UserGender.MALE);
    expect(saved.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it('updates only provided fields on existing profile', async () => {
    usersRepo.exists.mockResolvedValue(true);
    profileRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      firstName: 'Aarav',
      city: 'Pune',
    });

    const saved = await service.upsert('user-1', {
      city: 'Mumbai',
    });

    expect(saved.firstName).toBe('Aarav');
    expect(saved.city).toBe('Mumbai');
  });

  it('throws NotFoundException on completeOnboarding if profile does not exist', async () => {
    profileRepo.findOne.mockResolvedValue(null);

    await expect(service.completeOnboarding('user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
