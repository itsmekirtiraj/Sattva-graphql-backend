import { registerEnumType } from '@nestjs/graphql';

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
}

registerEnumType(UserGender, {
  name: 'UserGender',
  description: 'User gender',
});
