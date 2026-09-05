export type ApiResponse<T> = {
  code: number;
  data: T;
  message: string;
};

export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, data, message };
}

export function fail(message: string, code = 1): ApiResponse<null> {
  return { code, data: null, message };
}
