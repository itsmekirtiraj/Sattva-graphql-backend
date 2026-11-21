import { registerEnumType } from '@nestjs/graphql';

export enum OtpPurpose {
  LOGIN = 'login',
  REGISTRATION = 'registration',
  PHONE_CHANGE = 'phone_change',
}

registerEnumType(OtpPurpose, {
  name: 'OtpPurpose',
  description: 'Purpose of the OTP verification request',
});
