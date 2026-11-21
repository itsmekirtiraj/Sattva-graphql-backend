import { registerEnumType } from '@nestjs/graphql';

export enum OtpStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  LOCKED = 'locked',
  CANCELLED = 'cancelled',
}

registerEnumType(OtpStatus, {
  name: 'OtpStatus',
  description: 'Verification status of an OTP record',
});
