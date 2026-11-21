import { InputType } from '@nestjs/graphql';
import { PhoneOtpInput } from './phone-otp.input';

@InputType({ description: 'Input for requesting a registration OTP' })
export class RequestRegistrationOtpInput extends PhoneOtpInput {}
