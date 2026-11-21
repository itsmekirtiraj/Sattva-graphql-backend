import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { AppLoaders } from '../../common/dataloaders/dataloader.types';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { User } from '../users/entities/user.entity';
import { CreatePostInput } from './dto/create-post.input';
import { PaginatedPosts } from './dto/paginated-posts.type';
import { UpdatePostInput } from './dto/update-post.input';
import { Post } from './entities/post.entity';
import { PostsService } from './posts.service';

@Resolver(() => Post)
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Query(() => PaginatedPosts, { description: 'List published posts with pagination' })
  async posts(@Args() pagination: PaginationArgs): Promise<PaginatedPosts> {
    return this.postsService.findAll(pagination.offset, pagination.limit, true);
  }

  @Public()
  @Query(() => Post, { description: 'Find a single post by ID' })
  async post(@Args('id', { type: () => ID }) id: string): Promise<Post> {
    return this.postsService.findById(id);
  }

  @Mutation(() => Post, { description: 'Create a new post' })
  async createPost(
    @Args('input') input: CreatePostInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Post> {
    return this.postsService.create(input, currentUser.id);
  }

  @Mutation(() => Post, { description: 'Update an existing post (author or admin)' })
  async updatePost(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePostInput,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Post> {
    return this.postsService.update(id, input, currentUser);
  }

  @Mutation(() => Boolean, { description: 'Delete a post (author or admin)' })
  async deletePost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<boolean> {
    return this.postsService.delete(id, currentUser);
  }

  @ResolveField(() => User, { nullable: true })
  async author(
    @Parent() post: Post,
    @Context('loaders') loaders: AppLoaders,
  ): Promise<User | null> {
    return loaders.userByIdLoader.load(post.authorId);
  }
}

