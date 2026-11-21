import { Module } from '@nestjs/common';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';
import {
  InMemoryPostsRepository,
  PostsRepository,
} from './repositories/posts.repository';

@Module({
  providers: [
    PostsResolver,
    PostsService,
    {
      provide: PostsRepository,
      useClass: InMemoryPostsRepository,
    },
  ],
  exports: [PostsService],
})
export class PostsModule {}

