import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P2025: { status: 404, code: 'NOT_FOUND',       message: 'The requested record was not found.' },
  P2002: { status: 409, code: 'UNIQUE_CONFLICT',  message: 'A record with those values already exists.' },
  P2003: { status: 409, code: 'FOREIGN_KEY_FAIL', message: 'Referenced record does not exist.' },
  P2034: { status: 409, code: 'CONCURRENT_MODIFICATION', message: 'The record was modified by another request. Please retry.' },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const req  = ctx.getRequest<Request>();
    const res  = ctx.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) ?? 'unknown';
    const path      = req.url;
    const timestamp = new Date().toISOString();

    // Log full error server-side
    this.logger.error(`[${requestId}] ${String(exception)}`, exception instanceof Error ? exception.stack : undefined);

    // --- Prisma known errors ---
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        const meta = exception.meta ?? {};
        return res.status(mapped.status).json({
          statusCode: mapped.status,
          error:      this.httpStatusText(mapped.status),
          code:       mapped.code,
          message:    mapped.message,
          path, timestamp, requestId,
          meta,
        });
      }
      return res.status(500).json({
        statusCode: 500,
        error:      'Internal Server Error',
        code:       'DATABASE_ERROR',
        message:    'An unexpected database error occurred.',
        path, timestamp, requestId,
      });
    }

    // --- NestJS HttpExceptions (including our own thrown ones) ---
    if (exception instanceof HttpException) {
      const status   = exception.getStatus();
      const response = exception.getResponse() as Record<string, unknown> | string;

      if (typeof response === 'object') {
        // Preserve all fields from the thrown response (code, changes, conflicts, etc.)
        return res.status(status).json({
          statusCode: status,
          error:      this.httpStatusText(status),
          timestamp,
          requestId,
          path,
          ...response,
        });
      }

      return res.status(status).json({
        statusCode: status,
        error:      this.httpStatusText(status),
        code:       'HTTP_ERROR',
        message:    response,
        path, timestamp, requestId,
      });
    }

    // --- Unknown ---
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error:      'Internal Server Error',
      code:       'UNEXPECTED_ERROR',
      message:    'An unexpected error occurred.',
      path, timestamp, requestId,
    });
  }

  private httpStatusText(status: number): string {
    return (
      {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        500: 'Internal Server Error',
      }[status] ?? 'Error'
    );
  }
}
