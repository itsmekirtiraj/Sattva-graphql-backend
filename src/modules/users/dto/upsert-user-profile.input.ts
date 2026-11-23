import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../../common/decorators/transform.decorators';
import { UserGender } from '../enums/user-gender.enum';

@InputType({ description: 'Input for creating or updating a user profile' })
export class UpsertUserProfileInput {
  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(150)
  displayName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @Trim()
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @Field(() => UserGender, { nullable: true })
  @IsEnum(UserGender)
  @IsOptional()
  gender?: UserGender;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  state?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsUrl({ require_protocol: true })
  @IsOptional()
  profileImageUrl?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(10)
  preferredLanguage?: string;

  @Field(() => String, { nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Set true to mark onboarding as completed',
  })
  @IsBoolean()
  @IsOptional()
  markOnboardingCompleted?: boolean;
}
