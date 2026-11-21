import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GraphQLExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): unknown {
    // Let standard HTTP controllers (e.g. /health) use NestJS default HTTP handling
    if (host.getType<string>() !== 'graphql') {
      throw exception;
    }

    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo<{ fieldName?: string; parentType?: { name?: string } }>();
    const operation = info
      ? `${info.parentType?.name ?? 'Unknown'}.${info.fieldName ?? 'unknown'}`
      : 'GraphQL';

    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
              exception.message);

      const normalizedMessage = Array.isArray(message)
        ? message.join('; ')
        : message;

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`[${operation}] ${normalizedMessage}`, exception.stack);
      } else {
        this.logger.warn(`[${operation}] ${status} ${normalizedMessage}`);
      }

      return new GraphQLError(normalizedMessage, {
        extensions: {
          code: this.mapStatusToCode(status),
          httpStatus: status,
        },
      });
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`[${operation}] Unhandled error: ${err.message}`, err.stack);

    const isProd = process.env.NODE_ENV === 'production';
    return new GraphQLError(
      isProd ? 'Internal server error' : err.message,
      {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      },
    );
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_USER_INPUT';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}

