import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Assigns a unique request ID to every incoming request.
 * Reads X-Request-Id header if provided; generates one otherwise.
 * Echoes the ID on every response via X-Request-Id header.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existing = req.headers['x-request-id'] as string | undefined;
    const id       = existing ?? crypto.randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
