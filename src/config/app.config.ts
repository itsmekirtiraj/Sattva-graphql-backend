import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  synchronize: boolean;
}

export interface OtpConfig {
  expiryMinutes: number;
  maxAttempts: number;
  resendCooldownSeconds: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  graphqlPlayground: boolean;
  database: DatabaseConfig;
  otp: OtpConfig;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    jwtSecret:
      process.env.JWT_SECRET ?? 'dev-only-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      'dev-only-refresh-secret-change-in-production',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    graphqlPlayground:
      process.env.GRAPHQL_PLAYGROUND !== undefined
        ? process.env.GRAPHQL_PLAYGROUND === 'true'
        : process.env.NODE_ENV !== 'production',
    database: {
      url: process.env.DATABASE_URL || undefined,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      name: process.env.DB_NAME ?? 'sattvamasterbackend',
      ssl: process.env.DB_SSL === 'true',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    },
    otp: {
      expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? 5),
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
      resendCooldownSeconds: Number(
        process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60,
      ),
    },
  }),
);
