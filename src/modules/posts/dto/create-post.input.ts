import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType({ description: 'Payload for creating a post' })
export class CreatePostInput {
  @Field(() => String)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @Field(() => String)
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content!: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean = false;
}

