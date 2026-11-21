import { Field, ID, ObjectType } from '@nestjs/graphql';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@ObjectType({ description: 'Response returned after sending an OTP' })
export class RequestOtpResponse {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => ID)
  otpId!: string;

  @Field(() => OtpPurpose)
  purpose!: OtpPurpose;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => Date)
  resendAvailableAt!: Date;
}
