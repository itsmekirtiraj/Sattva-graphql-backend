import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/decorators/roles.decorator';
import { PostsService } from './posts.service';
import { InMemoryPostsRepository } from './repositories/posts.repository';

describe('PostsService', () => {
  let service: PostsService;

  const author = { id: 'author-1', email: 'a@example.com', role: UserRole.USER };
  const otherUser = { id: 'other-2', email: 'o@example.com', role: UserRole.USER };
  const admin = { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN };

  beforeEach(() => {
    service = new PostsService(new InMemoryPostsRepository());
  });

  it('should create and fetch a post', async () => {
    const post = await service.create(
      { title: 'Hello GraphQL', content: 'This is a sample post body.', published: true },
      author.id,
    );

    const found = await service.findById(post.id);
    expect(found.title).toBe('Hello GraphQL');
    expect(found.authorId).toBe(author.id);
  });

  it('should forbid non-author non-admin from updating a post', async () => {
    const post = await service.create(
      { title: 'Owned Post', content: 'Content with enough length.', published: false },
      author.id,
    );

    await expect(
      service.update(post.id, { title: 'Hijacked' }, otherUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow author and admin to update a post', async () => {
    const post = await service.create(
      { title: 'Draft Post', content: 'Content with enough length.', published: false },
      author.id,
    );

    const byAuthor = await service.update(post.id, { published: true }, author);
    expect(byAuthor.published).toBe(true);

    const byAdmin = await service.update(post.id, { title: 'Admin Edited' }, admin);
    expect(byAdmin.title).toBe('Admin Edited');
  });

  it('should throw NotFoundException when deleting missing post', async () => {
    await expect(service.delete('missing-id', admin)).rejects.toThrow(
      NotFoundException,
    );
  });
});

