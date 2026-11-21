import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 20, description: 'Maximum items to return' })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Field(() => Int, { defaultValue: 0, description: 'Number of items to skip' })
  @IsInt()
  @Min(0)
  offset: number = 0;
}

