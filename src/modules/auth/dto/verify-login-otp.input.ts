import { InputType } from '@nestjs/graphql';
import { VerifyPhoneOtpInput } from './phone-otp.input';

@InputType({
  description: 'Input for verifying login OTP and issuing bearer tokens',
})
export class VerifyLoginOtpInput extends VerifyPhoneOtpInput {}
