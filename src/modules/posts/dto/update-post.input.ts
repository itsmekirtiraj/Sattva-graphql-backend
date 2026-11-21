import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType({ description: 'Payload for updating a post' })
export class UpdatePostInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  @IsOptional()
  title?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  @IsOptional()
  content?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

