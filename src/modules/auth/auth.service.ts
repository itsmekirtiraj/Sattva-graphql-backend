import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomInt } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { AppConfig } from '../../config/app.config';
import { Role } from '../users/entities/role.entity';
import { UserRoleEntity } from '../users/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { AccountStatus } from '../users/enums/account-status.enum';
import { UsersService } from '../users/users.service';
import { AuthPayload } from './dto/auth-payload.type';
import { RequestLoginOtpInput } from './dto/request-login-otp.input';
import { RequestOtpResponse } from './dto/request-otp.response';
import { RequestRegistrationOtpInput } from './dto/request-registration-otp.input';
import { VerifyLoginOtpInput } from './dto/verify-login-otp.input';
import { VerifyRegistrationOtpInput } from './dto/verify-registration-otp.input';
import { UserOtpVerification } from './entities/user-otp-verification.entity';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { OtpStatus } from './enums/otp-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserOtpVerification)
    private readonly otpRepository: Repository<UserOtpVerification>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async requestRegistrationOtp(
    input: RequestRegistrationOtpInput,
    clientIp?: string,
  ): Promise<RequestOtpResponse> {
    const existingUser = await this.usersService.findByPhone(
      input.phoneCountryCode,
      input.phoneNumber,
    );
    if (existingUser) {
      throw new ConflictException('Phone number is already registered');
    }

    return this.createAndSendOtp(
      input.phoneCountryCode,
      input.phoneNumber,
      OtpPurpose.REGISTRATION,
      clientIp,
    );
  }

  async requestLoginOtp(
    input: RequestLoginOtpInput,
    clientIp?: string,
  ): Promise<RequestOtpResponse> {
    const existingUser = await this.usersService.findByPhone(
      input.phoneCountryCode,
      input.phoneNumber,
    );
    if (!existingUser) {
      throw new NotFoundException('No account found with this phone number');
    }
    if (existingUser.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException(
        `Account is ${existingUser.status} and cannot sign in`,
      );
    }

    return this.createAndSendOtp(
      input.phoneCountryCode,
      input.phoneNumber,
      OtpPurpose.LOGIN,
      clientIp,
    );
  }

  async verifyRegistrationOtp(
    input: VerifyRegistrationOtpInput,
  ): Promise<AuthPayload> {
    const otpRecord = await this.validatePendingOtp(
      input.phoneCountryCode,
      input.phoneNumber,
      OtpPurpose.REGISTRATION,
      input.otp,
    );

    const now = new Date();
    const createdUser = await this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(User, {
        where: {
          phoneCountryCode: input.phoneCountryCode,
          phoneNumber: input.phoneNumber,
        },
      });
      if (existingUser) {
        throw new ConflictException('Phone number is already registered');
      }

      otpRecord.status = OtpStatus.VERIFIED;
      otpRecord.verifiedAt = now;
      await manager.save(UserOtpVerification, otpRecord);

      const userEntity = manager.create(User, {
        phoneCountryCode: input.phoneCountryCode,
        phoneNumber: input.phoneNumber,
        phoneVerifiedAt: now,
        status: AccountStatus.ACTIVE,
        lastLoginAt: now,
      });
      const savedUser = await manager.save(User, userEntity);

      let defaultRole = await manager.findOne(Role, {
        where: { code: UserRole.USER },
      });
      if (!defaultRole) {
        defaultRole = await manager.save(
          Role,
          manager.create(Role, {
            code: UserRole.USER,
            name: 'Standard User',
          }),
        );
      }

      const userRole = manager.create(UserRoleEntity, {
        userId: savedUser.id,
        roleId: defaultRole.id,
        assignedAt: now,
      });
      await manager.save(UserRoleEntity, userRole);

      return savedUser;
    });

    return this.issueTokens(createdUser, UserRole.USER);
  }

  async verifyLoginOtp(input: VerifyLoginOtpInput): Promise<AuthPayload> {
    const otpRecord = await this.validatePendingOtp(
      input.phoneCountryCode,
      input.phoneNumber,
      OtpPurpose.LOGIN,
      input.otp,
    );

    const now = new Date();
    const loggedInUser = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: {
          phoneCountryCode: input.phoneCountryCode,
          phoneNumber: input.phoneNumber,
        },
      });
      if (!user) {
        throw new NotFoundException('No account found with this phone number');
      }
      if (user.status !== AccountStatus.ACTIVE) {
        throw new ForbiddenException(
          `Account is ${user.status} and cannot sign in`,
        );
      }

      otpRecord.status = OtpStatus.VERIFIED;
      otpRecord.verifiedAt = now;
      await manager.save(UserOtpVerification, otpRecord);

      user.lastLoginAt = now;
      user.phoneVerifiedAt = user.phoneVerifiedAt ?? now;
      return manager.save(User, user);
    });

    const roleCodes = await this.usersService.getUserRoleCodes(loggedInUser.id);
    const primaryRole = roleCodes.includes(UserRole.ADMIN)
      ? UserRole.ADMIN
      : UserRole.USER;

    return this.issueTokens(loggedInUser, primaryRole);
  }

  private async createAndSendOtp(
    phoneCountryCode: string,
    phoneNumber: string,
    purpose: OtpPurpose,
    clientIp?: string,
  ): Promise<RequestOtpResponse> {
    const cfg = this.configService.getOrThrow<AppConfig>('app');
    const now = new Date();

    const latestPending = await this.otpRepository.findOne({
      where: {
        phoneCountryCode,
        phoneNumber,
        purpose,
        status: OtpStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (latestPending) {
      const cooldownMs = cfg.otp.resendCooldownSeconds * 1000;
      const elapsedMs = now.getTime() - latestPending.createdAt.getTime();
      if (elapsedMs < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new HttpException(
          `Please wait ${waitSeconds}s before requesting a new OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.otpRepository.update(
        {
          phoneCountryCode,
          phoneNumber,
          purpose,
          status: OtpStatus.PENDING,
        },
        { status: OtpStatus.CANCELLED },
      );
    }

    const otpCode = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(
      now.getTime() + cfg.otp.expiryMinutes * 60 * 1000,
    );
    const resendAvailableAt = new Date(
      now.getTime() + cfg.otp.resendCooldownSeconds * 1000,
    );

    const requestIpHash = clientIp
      ? createHash('sha256').update(clientIp).digest('hex')
      : null;

    const otpRecord = this.otpRepository.create({
      phoneCountryCode,
      phoneNumber,
      purpose,
      otpHash: hashPassword(otpCode),
      status: OtpStatus.PENDING,
      attemptsCount: 0,
      maxAttempts: cfg.otp.maxAttempts,
      expiresAt,
      requestIpHash,
      providerReference: `local-${Date.now()}`,
    });

    const savedOtp = await this.otpRepository.save(otpRecord);

    if (cfg.nodeEnv !== 'production') {
      this.logger.debug(
        `[DEV OTP] ${purpose.toUpperCase()} OTP for ${phoneCountryCode}${phoneNumber}: ${otpCode}`,
      );
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      otpId: savedOtp.id,
      purpose: savedOtp.purpose,
      expiresAt: savedOtp.expiresAt,
      resendAvailableAt,
    };
  }

  private async validatePendingOtp(
    phoneCountryCode: string,
    phoneNumber: string,
    purpose: OtpPurpose,
    otp: string,
  ): Promise<UserOtpVerification> {
    const otpRecord = await this.otpRepository.findOne({
      where: {
        phoneCountryCode,
        phoneNumber,
        purpose,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord || otpRecord.status === OtpStatus.CANCELLED) {
      throw new BadRequestException(
        `No pending ${purpose} OTP found. Please request a new OTP.`,
      );
    }

    if (otpRecord.status === OtpStatus.LOCKED) {
      throw new BadRequestException(
        'OTP is locked due to too many failed attempts. Please request a new OTP.',
      );
    }

    if (otpRecord.status !== OtpStatus.PENDING) {
      throw new BadRequestException(
        `No pending ${purpose} OTP found. Please request a new OTP.`,
      );
    }

    const now = new Date();
    if (otpRecord.expiresAt.getTime() < now.getTime()) {
      otpRecord.status = OtpStatus.EXPIRED;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException(
        'OTP has expired. Please request a new OTP.',
      );
    }

    if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
      otpRecord.status = OtpStatus.LOCKED;
      await this.otpRepository.save(otpRecord);
      throw new BadRequestException(
        'Maximum OTP verification attempts exceeded. Please request a new OTP.',
      );
    }

    const isValid = verifyPassword(otp, otpRecord.otpHash);
    if (!isValid) {
      otpRecord.attemptsCount += 1;
      if (otpRecord.attemptsCount >= otpRecord.maxAttempts) {
        otpRecord.status = OtpStatus.LOCKED;
      }
      await this.otpRepository.save(otpRecord);
      throw new UnauthorizedException('Invalid OTP');
    }

    return otpRecord;
  }

  private async issueTokens(user: User, role: UserRole): Promise<AuthPayload> {
    const cfg = this.configService.getOrThrow<AppConfig>('app');

    const accessPayload: AuthenticatedUser = {
      id: user.id,
      phoneCountryCode: user.phoneCountryCode,
      phoneNumber: user.phoneNumber,
      role,
    };

    const refreshPayload = {
      id: user.id,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: cfg.jwtSecret,
        expiresIn: cfg.jwtExpiresIn as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: cfg.jwtRefreshSecret,
        expiresIn: cfg.jwtRefreshExpiresIn as JwtSignOptions['expiresIn'],
      }),
    ]);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken,
      accessTokenExpiry: this.extractExpiryDate(accessToken),
      refreshTokenExpiry: this.extractExpiryDate(refreshToken),
      user,
    };
  }

  private extractExpiryDate(token: string): Date {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (decoded && typeof decoded.exp === 'number') {
      return new Date(decoded.exp * 1000);
    }
    return new Date();
  }
}
