
import { useApi } from '~/composables/useApi';

export type RoleItem = { id: number; name: string; visible_name: string; permissions?: any[] }
export type SaveRoleDto = { name: string; visible_name: string; permissions?: number[] }

export function listRoles() {
  return useApi<{ success: boolean; data: RoleItem[] }>('/api/roles', { method: 'GET' })
}

export function getRole(id: number) {
  return useApi<{ success: boolean; data: RoleItem }>(`/api/roles/${id}`, { method: 'GET' })
}

export function listPermissions() {
  return useApi<{ success: boolean; data: { id:number; name:string; visible_name?:string }[] }>(
    '/api/roles/permissions', { method: 'GET' }
  )
}

export function createRole(dto: SaveRoleDto) {
  return useApi<{ success: boolean; data: RoleItem; message?: string }>('/api/roles', {
    method: 'POST',
    body: dto,
  })
}

export function updateRole(id: number, dto: SaveRoleDto) {
  return useApi<{ success: boolean; data: RoleItem; message?: string }>(`/api/roles/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteRole(id: number) {
  return useApi<{ success: boolean; message?: string }>(`/api/roles/${id}`, { method: 'DELETE' })
}
