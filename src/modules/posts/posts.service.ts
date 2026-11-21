import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/pagination/paginated.type';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { Post } from './entities/post.entity';
import { PostsRepository } from './repositories/posts.repository';

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  async findById(id: string): Promise<Post> {
    const post = await this.postsRepository.findById(id);
    if (!post) {
      throw new NotFoundException(`Post with id "${id}" not found`);
    }
    return post;
  }

  async findAll(
    offset: number,
    limit: number,
    publishedOnly = false,
  ): Promise<PaginatedResult<Post>> {
    return this.postsRepository.findAll(offset, limit, publishedOnly);
  }

  async create(input: CreatePostInput, authorId: string): Promise<Post> {
    return this.postsRepository.create({
      title: input.title,
      content: input.content,
      published: input.published ?? false,
      authorId,
    });
  }

  async update(
    id: string,
    input: UpdatePostInput,
    actor: AuthenticatedUser,
  ): Promise<Post> {
    const existing = await this.findById(id);
    this.assertCanModify(existing, actor);

    const updated = await this.postsRepository.update(id, {
      title: input.title,
      content: input.content,
      published: input.published,
    });
    if (!updated) {
      throw new NotFoundException(`Post with id "${id}" not found`);
    }
    return updated;
  }

  async delete(id: string, actor: AuthenticatedUser): Promise<boolean> {
    const existing = await this.findById(id);
    this.assertCanModify(existing, actor);
    return this.postsRepository.delete(id);
  }

  private assertCanModify(post: Post, actor: AuthenticatedUser): void {
    if (post.authorId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to modify this post');
    }
  }
}

