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

export type InvitationDto = {
  email: string
  role_id: number
  meta?: Record<string, any>
}

export type InvitationResponse = {
  success: boolean
  mail_sent?: boolean
  message?: string
  data?: User
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

export function inviteUser(dto: InvitationDto) {
  return useApi<InvitationResponse>('/api/invitations', { method: 'POST', body: dto })
}

export function revokeInvite(id: number) {
  return useApi<{ success: boolean; message: string }>(`/api/invitations/${id}`, { method: 'DELETE' })
}

export function updateUser(id: number, dto: SaveUserDto) {
  return useApi<{ success: boolean; data: User }>(`/api/users/${id}`, { method: 'PUT', body: dto })
}

export function deleteUser(id: number) {
  return useApi<{ success: boolean }>(`/api/users/${id}`, { method: 'DELETE' })
}

export function acceptInvitation(token: string) {
  return useApi<{ success: boolean; message?: string }>( '/api/invitations/accept', { method: 'POST', body: { token } })
}
