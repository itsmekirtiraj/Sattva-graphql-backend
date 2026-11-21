import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../../common/pagination/paginated.type';
import { Post } from '../entities/post.entity';

@ObjectType({ description: 'Paginated list of posts' })
export class PaginatedPosts extends Paginated(Post) {}

