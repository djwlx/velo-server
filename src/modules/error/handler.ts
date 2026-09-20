import type { ErrorHandler } from 'hono';

import { ErrorCode } from '../../config/error-code.js';
import { rootLogger } from '../../libs/logger.js';
import { fail } from '../../utils/response.js';

export const errorHandler: ErrorHandler = (error, c) => {
  rootLogger.error({ err: error, requestId: c.var.requestId }, 'unhandled request error');
  return c.json(fail('internalError', ErrorCode.InternalError), 500);
};
