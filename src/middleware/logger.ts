// src/middleware/logger.ts
import { structuredLogger } from '@hono/structured-logger';
import type { MiddlewareHandler } from 'hono';

import { rootLogger } from '../libs/logger.js';

export function loggerMiddleware(): MiddlewareHandler {
  return structuredLogger({
    createLogger: (c) => {
      return rootLogger.child({
        requestId: c.var.requestId,
      });
    },
    onResponse: (logger, c, elapsedMs) => {
      if (c.req.path.startsWith('/.well-known/')) return;
      logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          elapsedMs,
        },
        'request completed',
      );
    },
  });
}
