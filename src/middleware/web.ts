import { serveStatic } from '@hono/node-server/serve-static';
import type { MiddlewareHandler } from 'hono';

import { initWeb } from '../modules/update/service.js';

export async function webMiddleware(): Promise<MiddlewareHandler> {
  const root = await initWeb();
  const serveFile = serveStatic({ root });
  const serveIndex = serveStatic({ root, path: 'index.html' });

  return async (c, next) => {
    if (c.req.path.startsWith('/api')) return next();

    let indexResponse: Response | void = undefined;
    const fileResponse = await serveFile(c, async () => {
      indexResponse = await serveIndex(c, next);
    });

    const response = fileResponse ?? indexResponse;
    if (!response) return;

    const contentType = response.headers.get('content-type') ?? '';
    response.headers.set(
      'Cache-Control',
      contentType.includes('text/html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable'
    );
    c.res = response;
  };
}
