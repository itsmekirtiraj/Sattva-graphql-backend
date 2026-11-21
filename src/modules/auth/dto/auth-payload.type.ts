import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType({ description: 'Authentication response containing JWT token and user' })
export class AuthPayload {
  @Field(() => String)
  accessToken!: string;

  @Field(() => User)
  user!: User;
}
