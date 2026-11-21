import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthPayload } from './dto/auth-payload.type';
import { RequestLoginOtpInput } from './dto/request-login-otp.input';
import { RequestOtpResponse } from './dto/request-otp.response';
import { RequestRegistrationOtpInput } from './dto/request-registration-otp.input';
import { VerifyLoginOtpInput } from './dto/verify-login-otp.input';
import { VerifyRegistrationOtpInput } from './dto/verify-registration-otp.input';

interface RequestWithIp {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => RequestOtpResponse, {
    description: 'Send an OTP to the user phone number for registration',
  })
  async requestRegistrationOtp(
    @Args('input') input: RequestRegistrationOtpInput,
    @Context('req') req?: RequestWithIp,
  ): Promise<RequestOtpResponse> {
    return this.authService.requestRegistrationOtp(input, this.extractIp(req));
  }

  @Public()
  @Mutation(() => AuthPayload, {
    description:
      'Verify registration OTP, create user account, and issue bearer tokens',
  })
  async verifyRegistrationOtp(
    @Args('input') input: VerifyRegistrationOtpInput,
  ): Promise<AuthPayload> {
    return this.authService.verifyRegistrationOtp(input);
  }

  @Public()
  @Mutation(() => RequestOtpResponse, {
    description: 'Send an OTP to an existing user phone number for login',
  })
  async requestLoginOtp(
    @Args('input') input: RequestLoginOtpInput,
    @Context('req') req?: RequestWithIp,
  ): Promise<RequestOtpResponse> {
    return this.authService.requestLoginOtp(input, this.extractIp(req));
  }

  @Public()
  @Mutation(() => AuthPayload, {
    description: 'Verify login OTP and issue bearer tokens',
  })
  async verifyLoginOtp(
    @Args('input') input: VerifyLoginOtpInput,
  ): Promise<AuthPayload> {
    return this.authService.verifyLoginOtp(input);
  }

  private extractIp(req?: RequestWithIp): string | undefined {
    const forwardedFor = req?.headers?.['x-forwarded-for'];
    return Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor?.split(',')[0]?.trim() ?? req?.ip);
  }
}
