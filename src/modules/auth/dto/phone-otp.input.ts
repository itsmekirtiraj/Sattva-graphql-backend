import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import {
  NormalizeDigits,
  Trim,
} from '../../../common/decorators/transform.decorators';

@InputType({ isAbstract: true })
export abstract class PhoneOtpInput {
  @Field(() => String, {
    nullable: true,
    defaultValue: '+91',
    description: 'Dialing country code (e.g. +91)',
  })
  @Trim()
  @IsString()
  @IsOptional()
  @Matches(/^\+[1-9]\d{0,3}$/, {
    message: 'phoneCountryCode must be a valid dialing code like +91',
  })
  phoneCountryCode: string = '+91';

  @Field(() => String, {
    description: 'Local phone number without country code (digits only)',
  })
  @NormalizeDigits()
  @IsString()
  @Matches(/^\d{6,15}$/, {
    message: 'phoneNumber must contain 6 to 15 digits',
  })
  phoneNumber!: string;
}

@InputType({ isAbstract: true })
export abstract class VerifyPhoneOtpInput extends PhoneOtpInput {
  @Field(() => String, { description: '6-digit OTP code' })
  @Trim()
  @IsString()
  @Length(6, 6, { message: 'otp must be a 6-digit code' })
  @Matches(/^\d{6}$/, { message: 'otp must contain only digits' })
  otp!: string;
}
