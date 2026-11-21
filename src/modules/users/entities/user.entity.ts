import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountStatus } from '../enums/account-status.enum';

@ObjectType({ description: 'Registered user account' })
@Entity({ name: 'users' })
@Index('IDX_users_phone_unique', ['phoneCountryCode', 'phoneNumber'], {
  unique: true,
})
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => String)
  @Column({
    name: 'phone_country_code',
    type: 'varchar',
    length: 5,
    default: '+91',
  })
  phoneCountryCode!: string;

  @Field(() => String)
  @Column({ name: 'phone_number', type: 'varchar', length: 15 })
  phoneNumber!: string;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'phone_verified_at', type: 'timestamp', nullable: true })
  phoneVerifiedAt?: Date | null;

  @Field(() => AccountStatus)
  @Column({
    name: 'status',
    type: 'enum',
    enum: AccountStatus,
    enumName: 'account_status',
    default: AccountStatus.ACTIVE,
  })
  status!: AccountStatus;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date | null;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
