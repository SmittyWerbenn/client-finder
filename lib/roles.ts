import type { Role } from './db/schema';

/** Helper role yang aman diimpor komponen client (tanpa akses server/DB). */

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  USER: 'User',
};

export function isAdmin(role: Role): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN';
}

export function canManageUsers(role: Role): boolean {
  return role === 'SUPERADMIN';
}
