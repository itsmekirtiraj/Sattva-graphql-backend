import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

@InputType({ description: 'Payload for updating an existing user' })
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @IsOptional()
  name?: string;
}

