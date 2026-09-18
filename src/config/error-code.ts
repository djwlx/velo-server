export const ErrorCode = {
  InvalidRequest: 10001,
  ValidationFailed: 10002,
  AuthenticationRequired: 20001,
  InvalidCredentials: 20002,
  PermissionDenied: 30001,
  ResourceNotFound: 40001,
  ResourceConflict: 40002,
  ExternalServiceFailed: 50001,
  ConfigurationMissing: 60001,
  InternalError: 90001,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
