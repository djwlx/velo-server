export const ADMIN_ROLE = 'admin' as const;

export const PERMISSIONS = [
  {
    code: 'module:115',
    module: '115',
    name: '115 module access',
    description: 'Access 115 file and picture APIs',
  },
  {
    code: 'module:auth',
    module: 'auth',
    name: 'Auth module access',
    description: 'Manage users and roles, view permissions',
  },
  {
    module: 'config',
    code: 'module:config',
    name: 'Config module access',
    description: 'Access configuration and version APIs',
  },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['code'];

export const ALL_PERMISSIONS = PERMISSIONS.map(({ code }) => code) as Permission[];
