// services/clientUserService.ts
import type { ClientUser, CreateClientUserDto, UpdateClientUserDto } from '@/types/clientUser'
import { useApi } from '../composables/useApi'

export function getClientUsers() {
  return useApi<{ data: ClientUser[] }>('/api/client-users', {
    method: 'GET',
  })
}

export function getClientUser(id: number) {
  return useApi<{ data: ClientUser }>(`/api/client-users/${id}`, {
    method: 'GET',
  })
}

export function getClientsByUser(userId: number) {
  return useApi<{ data: any[] }>(`/api/client-users/clients?user_id=${userId}`, {
    method: 'GET',
  })
}

export function getUsersByClient() {
  return useApi<{ data: any[] }>(`/api/client-users/users`, {
    method: 'GET',
  })
}

export function createClientUser(dto: CreateClientUserDto) {
  return useApi<{ data: ClientUser }>('/api/client-users', {
    method: 'POST',
    body: dto,
  })
}

export function updateClientUser(id: number, dto: UpdateClientUserDto) {
  return useApi<{ data: ClientUser }>(`/api/client-users/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteClientUser(id: number) {
  return useApi(`/api/client-users/${id}`, {
    method: 'DELETE',
  })
}
