import { registerEnumType } from '@nestjs/graphql';

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

registerEnumType(AccountStatus, {
  name: 'AccountStatus',
  description: 'User account lifecycle status',
});
