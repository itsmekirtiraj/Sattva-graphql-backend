import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const label = this.resolveOperationLabel(context);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(`${label} completed in ${durationMs}ms`);
        },
        error: (err: Error) => {
          const durationMs = Date.now() - startedAt;
          this.logger.warn(
            `${label} failed in ${durationMs}ms: ${err.message}`,
          );
        },
      }),
    );
  }

  private resolveOperationLabel(context: ExecutionContext): string {
    if (context.getType<string>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo<{
        parentType?: { name?: string };
        fieldName?: string;
      }>();
      return `GQL ${info?.parentType?.name ?? 'Operation'}.${info?.fieldName ?? 'unknown'}`;
    }
    const req = context
      .switchToHttp()
      .getRequest<{ method?: string; url?: string }>();
    return `HTTP ${req?.method ?? 'REQ'} ${req?.url ?? '/'}`;
  }
}

