import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { hashPassword } from '../../common/utils/password.util';
import { Role } from '../users/entities/role.entity';
import { UserRoleEntity } from '../users/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { AccountStatus } from '../users/enums/account-status.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { UserOtpVerification } from './entities/user-otp-verification.entity';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { OtpStatus } from './enums/otp-status.enum';

describe('AuthService', () => {
  let service: AuthService;
  let otpRepo: {
    findOne: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let usersService: {
    findByPhone: jest.Mock;
    getUserRoleCodes: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; decode: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const mockConfig = {
    nodeEnv: 'test',
    jwtSecret: 'test-access-secret-1234',
    jwtExpiresIn: '15m',
    jwtRefreshSecret: 'test-refresh-secret-1234',
    jwtRefreshExpiresIn: '30d',
    otp: {
      expiryMinutes: 5,
      maxAttempts: 5,
      resendCooldownSeconds: 60,
    },
  };

  beforeEach(async () => {
    otpRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn((data) => ({ id: 'otp-uuid-1', ...data })),
      save: jest.fn(async (entity) => entity),
    };

    usersService = {
      findByPhone: jest.fn(),
      getUserRoleCodes: jest.fn(async () => ['USER']),
    };

    jwtService = {
      signAsync: jest.fn(async (payload: { type?: string }) =>
        payload.type === 'refresh' ? 'mock-refresh-token' : 'mock-access-token',
      ),
      decode: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 900 })),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserOtpVerification),
          useValue: otpRepo,
        },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(() => mockConfig) },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('requestRegistrationOtp', () => {
    it('throws ConflictException when phone number is already registered', async () => {
      usersService.findByPhone.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.requestRegistrationOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('enforces resend cooldown when a pending OTP was recently created', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      otpRepo.findOne.mockResolvedValue({
        id: 'otp-prev',
        createdAt: new Date(Date.now() - 10 * 1000),
      });

      await expect(
        service.requestRegistrationOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('creates hashed OTP and returns RequestOtpResponse', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      otpRepo.findOne.mockResolvedValue(null);

      const res = await service.requestRegistrationOtp(
        { phoneCountryCode: '+91', phoneNumber: '9876543210' },
        '127.0.0.1',
      );

      expect(res.success).toBe(true);
      expect(res.otpId).toBe('otp-uuid-1');
      expect(res.purpose).toBe(OtpPurpose.REGISTRATION);
      expect(otpRepo.save).toHaveBeenCalledTimes(1);
      const savedArg = otpRepo.save.mock.calls[0][0] as UserOtpVerification;
      expect(savedArg.otpHash).toContain(':');
      expect(savedArg.status).toBe(OtpStatus.PENDING);
    });
  });

  describe('verifyRegistrationOtp', () => {
    it('throws BadRequestException when no pending OTP exists', async () => {
      otpRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyRegistrationOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
          otp: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks OTP as EXPIRED and throws when past expiresAt', async () => {
      otpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        status: OtpStatus.PENDING,
        attemptsCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000),
        otpHash: hashPassword('123456'),
      });

      await expect(
        service.verifyRegistrationOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
          otp: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(otpRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OtpStatus.EXPIRED }),
      );
    });

    it('increments attempts and locks OTP after maxAttempts on invalid OTP', async () => {
      otpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        status: OtpStatus.PENDING,
        attemptsCount: 4,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60000),
        otpHash: hashPassword('123456'),
      });

      await expect(
        service.verifyRegistrationOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
          otp: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(otpRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptsCount: 5,
          status: OtpStatus.LOCKED,
        }),
      );
    });

    it('creates user and issues access + refresh tokens on valid OTP', async () => {
      const otpRecord = {
        id: 'otp-1',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        purpose: OtpPurpose.REGISTRATION,
        status: OtpStatus.PENDING,
        attemptsCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60000),
        otpHash: hashPassword('654321'),
      };
      otpRepo.findOne.mockResolvedValue(otpRecord);

      const createdUser: Partial<User> = {
        id: 'user-uuid-1',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        status: AccountStatus.ACTIVE,
      };

      const mockManager = {
        findOne: jest.fn(async (entity) => {
          if (entity === User) return null;
          if (entity === Role) return { id: 1, code: 'USER', name: 'Standard User' };
          return null;
        }),
        create: jest.fn((_entity, data) => data),
        save: jest.fn(async (entity, data) => {
          if (entity === User) return { ...createdUser, ...data };
          if (entity === UserRoleEntity) return data;
          return data;
        }),
      };

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      const result = await service.verifyRegistrationOtp({
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        otp: '654321',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.accessTokenExpiry).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiry).toBeInstanceOf(Date);
      expect(result.user.id).toBe('user-uuid-1');
      expect(otpRecord.status).toBe(OtpStatus.VERIFIED);
    });
  });

  describe('requestLoginOtp', () => {
    it('throws NotFoundException when phone number is not registered', async () => {
      usersService.findByPhone.mockResolvedValue(null);

      await expect(
        service.requestLoginOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when account is suspended', async () => {
      usersService.findByPhone.mockResolvedValue({
        id: 'user-1',
        status: AccountStatus.SUSPENDED,
      });

      await expect(
        service.requestLoginOtp({
          phoneCountryCode: '+91',
          phoneNumber: '9876543210',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates login OTP for active user', async () => {
      usersService.findByPhone.mockResolvedValue({
        id: 'user-1',
        status: AccountStatus.ACTIVE,
      });
      otpRepo.findOne.mockResolvedValue(null);

      const res = await service.requestLoginOtp({
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
      });

      expect(res.success).toBe(true);
      expect(res.purpose).toBe(OtpPurpose.LOGIN);
    });
  });

  describe('verifyLoginOtp', () => {
    it('verifies login OTP, updates lastLoginAt, and issues bearer tokens', async () => {
      const otpRecord = {
        id: 'otp-login-1',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        purpose: OtpPurpose.LOGIN,
        status: OtpStatus.PENDING,
        attemptsCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60000),
        otpHash: hashPassword('112233'),
      };
      otpRepo.findOne.mockResolvedValue(otpRecord);

      const existingUser: Partial<User> = {
        id: 'user-uuid-1',
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        status: AccountStatus.ACTIVE,
      };

      const mockManager = {
        findOne: jest.fn(async () => existingUser),
        save: jest.fn(async (_entity, data) => data),
      };

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      const result = await service.verifyLoginOtp({
        phoneCountryCode: '+91',
        phoneNumber: '9876543210',
        otp: '112233',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.lastLoginAt).toBeInstanceOf(Date);
      expect(otpRecord.status).toBe(OtpStatus.VERIFIED);
    });
  });
});
