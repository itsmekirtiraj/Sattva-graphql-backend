import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export function Paginated<T>(classRef: Type<T>): Type<PaginatedResult<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements PaginatedResult<T> {
    @Field(() => [classRef])
    items!: T[];

    @Field(() => Int)
    total!: number;

    @Field(() => Boolean)
    hasMore!: boolean;
  }

  return PaginatedType as Type<PaginatedResult<T>>;
}

