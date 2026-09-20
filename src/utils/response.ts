import type { ErrorCode } from '../config/error-code.js';
import type { MessageKey, MessageParams } from '../i18n/index.js';
import { t } from '../i18n/index.js';

export type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, data, message };
}

export function fail(
  message: MessageKey,
  code: ErrorCode,
  params?: MessageParams,
): ApiResponse<null> {
  return { code, data: null, message: t(message, params) };
}
