import type { AuthUser } from '../modules/auth/user/service.js';

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser;
    permissions: Set<string>;
  }
}
