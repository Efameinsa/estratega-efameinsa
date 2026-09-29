// ---------------------------------------------------------------------------
// Organization-level permissions
// ---------------------------------------------------------------------------

export const PERMISSIONS = {
  // Organización
  ORG_INVITE_MEMBERS:    ['PROPIETARIO', 'ADMINISTRADOR'],
  ORG_MANAGE_ROLES:      ['PROPIETARIO'],
  ORG_EDIT_SETTINGS:     ['PROPIETARIO', 'ADMINISTRADOR'],
  ORG_DELETE:            ['PROPIETARIO'],
  ORG_CREATE_CYCLE:      ['PROPIETARIO'],
  ORG_DELETE_CYCLE:      ['PROPIETARIO'],

  // Planeamiento estratégico
  STRATEGIC_VIEW:        ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],
  STRATEGIC_EDIT:        ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],

  // Proyectos y tareas
  PROJECT_VIEW:          ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],
  PROJECT_CREATE:        ['PROPIETARIO', 'ADMINISTRADOR'],
  PROJECT_EDIT:          ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],
  TASK_ASSIGN:           ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],
  TASK_CREATE:           ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],

  // Miembros
  MEMBERS_VIEW:          ['PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO'],
  MEMBERS_REMOVE:        ['PROPIETARIO', 'ADMINISTRADOR'],
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type OrgRole = 'PROPIETARIO' | 'ADMINISTRADOR' | 'MIEMBRO';

export function hasPermission(orgRole: OrgRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(orgRole);
}
