import { useApi } from '~/composables/useApi';

export type Role = { id: number; visible_name: string }
export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  address?: string | null
  avatar?: string | null
  role?: Role | null
  created_at?: string
}

export type SaveUserDto = {
  name: string
  email: string
  phone?: string | null
  address?: string | null
  role_id: number               
}

export type UserInClient = {
  email: string
  role_id: number               
}

export function getUsers() {
  return useApi<User[]>('/api/users', { method: 'GET' })
}

export function createUser(dto: SaveUserDto) {
  return useApi<{ success: boolean; data: User }>('/api/users', { method: 'POST', body: dto })
}

export function inviteUser(dto: UserInClient) {
  return useApi<{ success: boolean; data: User }>('/api/invitations', { method: 'POST', body: dto })
}

export function updateUser(id: number, dto: SaveUserDto) {
  return useApi<{ success: boolean; data: User }>(`/api/users/${id}`, { method: 'PUT', body: dto })
}

export function deleteUser(id: number) {
  return useApi<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' })
}
