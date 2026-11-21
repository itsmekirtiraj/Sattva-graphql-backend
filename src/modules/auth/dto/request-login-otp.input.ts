import { InputType } from '@nestjs/graphql';
import { PhoneOtpInput } from './phone-otp.input';

@InputType({ description: 'Input for requesting a login OTP' })
export class RequestLoginOtpInput extends PhoneOtpInput {}
