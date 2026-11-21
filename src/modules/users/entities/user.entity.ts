import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '../../../common/decorators/roles.decorator';

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'Role assigned to a user account',
});

@ObjectType({ description: 'User account' })
export class User {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  name!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export interface UserRecord extends User {
  passwordHash: string;
}

