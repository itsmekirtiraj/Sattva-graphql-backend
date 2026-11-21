import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 3000))
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsString()
  @MinLength(16)
  @IsOptional()
  JWT_SECRET: string = 'dev-only-secret-change-in-production';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @MinLength(16)
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'dev-only-refresh-secret-change-in-production';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  GRAPHQL_PLAYGROUND: boolean = true;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 5432))
  DB_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_NAME: string = 'sattvamasterbackend';

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  DB_SSL: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  DB_SYNCHRONIZE: boolean = false;

  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 5))
  OTP_EXPIRY_MINUTES: number = 5;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 5))
  OTP_MAX_ATTEMPTS: number = 5;

  @IsInt()
  @Min(0)
  @Max(600)
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 60))
  OTP_RESEND_COOLDOWN_SECONDS: number = 60;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validatedConfig;
}
