import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/pagination/paginated.type';
import { User } from '../entities/user.entity';

@ObjectType({ description: 'Paginated list of users' })
export class PaginatedUsers extends Paginated(User) {}

