import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaginatedResult } from '../../../common/pagination/paginated.type';
import { Post } from '../entities/post.entity';

export interface CreatePostRecordData {
  title: string;
  content: string;
  published: boolean;
  authorId: string;
}

export abstract class PostsRepository {
  abstract findById(id: string): Promise<Post | null>;
  abstract findAll(
    offset: number,
    limit: number,
    publishedOnly?: boolean,
  ): Promise<PaginatedResult<Post>>;
  abstract create(data: CreatePostRecordData): Promise<Post>;
  abstract update(
    id: string,
    data: Partial<Pick<Post, 'title' | 'content' | 'published'>>,
  ): Promise<Post | null>;
  abstract delete(id: string): Promise<boolean>;
}

@Injectable()
export class InMemoryPostsRepository extends PostsRepository {
  private readonly store = new Map<string, Post>();

  constructor() {
    super();
    this.seedDefaults();
  }

  async findById(id: string): Promise<Post | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(
    offset: number,
    limit: number,
    publishedOnly = false,
  ): Promise<PaginatedResult<Post>> {
    const filtered = Array.from(this.store.values()).filter((post) =>
      publishedOnly ? post.published : true,
    );
    const items = filtered.slice(offset, offset + limit);
    return {
      items,
      total: filtered.length,
      hasMore: offset + items.length < filtered.length,
    };
  }

  async create(data: CreatePostRecordData): Promise<Post> {
    const now = new Date();
    const post: Post = {
      id: randomUUID(),
      title: data.title.trim(),
      content: data.content.trim(),
      published: data.published,
      authorId: data.authorId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(post.id, post);
    return post;
  }

  async update(
    id: string,
    data: Partial<Pick<Post, 'title' | 'content' | 'published'>>,
  ): Promise<Post | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }
    const updated: Post = {
      ...existing,
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.content !== undefined ? { content: data.content.trim() } : {}),
      ...(data.published !== undefined ? { published: data.published } : {}),
      updatedAt: new Date(),
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  private seedDefaults(): void {
    const now = new Date();
    const sample1: Post = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'Production NestJS + GraphQL Architecture',
      content:
        'Using Code-First GraphQL, DataLoaders for N+1 prevention, and clean repository boundaries.',
      published: true,
      authorId: '11111111-1111-4111-8111-111111111111',
      createdAt: now,
      updatedAt: now,
    };
    const sample2: Post = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      title: 'Why DataLoaders Matter in GraphQL',
      content:
        'Batching and per-request caching keep database round-trips bounded even on deeply nested queries.',
      published: true,
      authorId: '22222222-2222-4222-8222-222222222222',
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(sample1.id, sample1);
    this.store.set(sample2.id, sample2);
  }
}

