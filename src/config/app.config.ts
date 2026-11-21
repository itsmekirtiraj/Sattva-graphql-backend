import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  graphqlPlayground: boolean;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    jwtSecret:
      process.env.JWT_SECRET ?? 'dev-only-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    graphqlPlayground:
      process.env.GRAPHQL_PLAYGROUND !== undefined
        ? process.env.GRAPHQL_PLAYGROUND === 'true'
        : process.env.NODE_ENV !== 'production',
  }),
);

