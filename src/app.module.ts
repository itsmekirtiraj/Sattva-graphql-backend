import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { GraphQLFormattedError } from 'graphql';
import { join } from 'node:path';
import { DataloadersModule } from './common/dataloaders/dataloaders.module';
import { DataloadersService } from './common/dataloaders/dataloaders.service';
import { GraphQLExceptionFilter } from './common/filters/graphql-exception.filter';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfig, appConfig } from './config/app.config';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const cfg = configService.getOrThrow<AppConfig>('app');
        return {
          secret: cfg.jwtSecret,
          signOptions: {
            expiresIn: cfg.jwtExpiresIn as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataloadersModule],
      inject: [ConfigService, DataloadersService],
      useFactory: (
        configService: ConfigService,
        dataloadersService: DataloadersService,
      ) => {
        const cfg = configService.getOrThrow<AppConfig>('app');
        const isProd = cfg.nodeEnv === 'production';

        return {
          autoSchemaFile:
            cfg.nodeEnv === 'test'
              ? true
              : join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          introspection: !isProd || cfg.graphqlPlayground,
          playground: false,
          plugins:
            !isProd || cfg.graphqlPlayground
              ? [ApolloServerPluginLandingPageLocalDefault()]
              : [],
          context: ({ req }: { req: Request }) => ({
            req,
            loaders: dataloadersService.createLoaders(),
          }),
          formatError: (formattedError: GraphQLFormattedError) => {
            if (isProd) {
              const { stacktrace: _stack, ...safeExtensions } =
                (formattedError.extensions ?? {}) as Record<string, unknown>;
              return {
                message: formattedError.message,
                locations: formattedError.locations,
                path: formattedError.path,
                extensions: safeExtensions,
              };
            }
            return formattedError;
          },
        };
      },
    }),
    DataloadersModule,
    UsersModule,
    AuthModule,
    PostsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}

