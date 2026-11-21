import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { OtpStatus } from '../enums/otp-status.enum';

@Entity({ name: 'user_otp_verifications' })
@Index('IDX_otp_phone_purpose_created', [
  'phoneCountryCode',
  'phoneNumber',
  'purpose',
  'createdAt',
])
@Index('IDX_otp_expires_at', ['expiresAt'])
export class UserOtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'phone_country_code', type: 'varchar', length: 5 })
  phoneCountryCode!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 15 })
  phoneNumber!: string;

  @Column({
    name: 'purpose',
    type: 'enum',
    enum: OtpPurpose,
    enumName: 'otp_purpose',
  })
  purpose!: OtpPurpose;

  @Column({ name: 'otp_hash', type: 'varchar', length: 255 })
  otpHash!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OtpStatus,
    enumName: 'otp_status',
    default: OtpStatus.PENDING,
  })
  status!: OtpStatus;

  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attemptsCount!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Column({
    name: 'request_ip_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  requestIpHash?: string | null;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerReference?: string | null;
}
