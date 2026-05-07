import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'internal_error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else if (r && typeof r === 'object') {
        const rec = r as Record<string, unknown>;
        message = (rec.message as string | string[]) ?? exception.message;
        code = (rec.code as string) ?? this.statusToCode(status);
        details = rec.details;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      code = 'validation_error';
      details = exception.flatten();
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      message = process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status} ${JSON.stringify(message)}`);
    }

    res.status(status).json({
      ok: false,
      error: { code, message, details },
      requestId: req.headers['x-request-id'] ?? undefined,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'bad_request',
      401: 'unauthorized',
      402: 'payment_required',
      403: 'forbidden',
      404: 'not_found',
      409: 'conflict',
      422: 'unprocessable_entity',
      429: 'rate_limited',
      451: 'moderated',
      500: 'internal_error',
      502: 'upstream_error',
      503: 'service_unavailable',
    };
    return map[status] ?? 'error';
  }
}
