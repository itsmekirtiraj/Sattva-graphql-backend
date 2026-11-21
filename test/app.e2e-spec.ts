import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('GraphQL API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /graphql serves Apollo Sandbox landing page', async () => {
    const res = await request(app.getHttpServer())
      .get('/graphql')
      .set('Accept', 'text/html')
      .expect(200);
    expect(res.text).toContain('Apollo');
  });

  it('queries public posts with DataLoader-resolved authors', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            posts(limit: 10, offset: 0) {
              total
              hasMore
              items {
                id
                title
                author {
                  id
                  name
                  email
                }
              }
            }
          }
        `,
      })
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.posts.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.posts.items[0].author.email).toBeDefined();
  });

  it('rejects unauthenticated access to protected queries', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `query { me { id email } }`,
      })
      .expect(200);

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('registers a user, accesses me, creates a post, and enforces admin RBAC', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              accessToken
              user {
                id
                email
                role
              }
            }
          }
        `,
        variables: {
          input: {
            email: 'e2e@example.com',
            name: 'E2E User',
            password: 'password123',
          },
        },
      })
      .expect(200);

    expect(registerRes.body.errors).toBeUndefined();
    const token = registerRes.body.data.register.accessToken as string;
    expect(token).toBeTruthy();

    const meRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `query { me { email name role } }`,
      })
      .expect(200);

    expect(meRes.body.data.me.email).toBe('e2e@example.com');
    expect(meRes.body.data.me.role).toBe('USER');

    const createPostRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
              published
              author {
                email
              }
            }
          }
        `,
        variables: {
          input: {
            title: 'E2E Created Post',
            content: 'Detailed content for the end to end GraphQL test.',
            published: true,
          },
        },
      })
      .expect(200);

    expect(createPostRes.body.errors).toBeUndefined();
    expect(createPostRes.body.data.createPost.author.email).toBe('e2e@example.com');

    const forbiddenRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `query { users { total } }`,
      })
      .expect(200);

    expect(forbiddenRes.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('allows seeded admin to list all users', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input) {
              accessToken
            }
          }
        `,
        variables: {
          input: {
            email: 'admin@example.com',
            password: 'admin1234',
          },
        },
      })
      .expect(200);

    const adminToken = loginRes.body.data.login.accessToken as string;

    const usersRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `query { users(limit: 10, offset: 0) { total items { email role } } }`,
      })
      .expect(200);

    expect(usersRes.body.errors).toBeUndefined();
    expect(usersRes.body.data.users.total).toBeGreaterThanOrEqual(2);
  });
});

