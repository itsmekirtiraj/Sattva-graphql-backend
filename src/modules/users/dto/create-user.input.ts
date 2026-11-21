import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/decorators/roles.decorator';

@InputType({ description: 'Payload for creating a new user' })
export class CreateUserInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Field(() => UserRole, { nullable: true, defaultValue: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.USER;
}

