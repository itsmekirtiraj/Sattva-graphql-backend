import { InputType } from '@nestjs/graphql';
import { VerifyPhoneOtpInput } from './phone-otp.input';

@InputType({
  description: 'Input for verifying registration OTP and creating user',
})
export class VerifyRegistrationOtpInput extends VerifyPhoneOtpInput {}
