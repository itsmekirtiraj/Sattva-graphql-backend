import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserGender } from '../enums/user-gender.enum';
import { User } from './user.entity';

@ObjectType({ description: 'User profile details' })
@Entity({ name: 'user_profiles' })
export class UserProfile {
  @Field(() => ID)
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Field(() => String, { nullable: true })
  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string | null;

  @Field(() => String, { nullable: true })
  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  displayName?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string | null;

  @Field(() => UserGender, { nullable: true })
  @Column({
    name: 'gender',
    type: 'enum',
    enum: UserGender,
    enumName: 'user_gender',
    nullable: true,
  })
  gender?: UserGender | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'state', type: 'varchar', length: 100, nullable: true })
  state?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'country', type: 'varchar', length: 100, nullable: true })
  country?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl?: string | null;

  @Field(() => String, { nullable: true })
  @Column({
    name: 'preferred_language',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  preferredLanguage?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: 'timezone', type: 'varchar', length: 50, nullable: true })
  timezone?: string | null;

  @Field(() => Date, { nullable: true })
  @Column({
    name: 'onboarding_completed_at',
    type: 'timestamp',
    nullable: true,
  })
  onboardingCompletedAt?: Date | null;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
