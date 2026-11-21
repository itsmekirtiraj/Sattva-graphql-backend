import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType({
  description: 'Authentication payload with bearer access & refresh tokens',
})
export class AuthPayload {
  @Field(() => String)
  tokenType!: string;

  @Field(() => String)
  accessToken!: string;

  @Field(() => String)
  refreshToken!: string;

  @Field(() => Date)
  accessTokenExpiry!: Date;

  @Field(() => Date)
  refreshTokenExpiry!: Date;

  @Field(() => User)
  user!: User;
}
