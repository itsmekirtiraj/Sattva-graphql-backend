import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType({ description: 'Blog or article post' })
export class Post {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;

  @Field(() => Boolean)
  published!: boolean;

  @Field(() => ID)
  authorId!: string;

  @Field(() => User, { nullable: true, description: 'Resolved via DataLoader' })
  author?: User | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

