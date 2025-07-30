import { useApi } from '../composables/useApi'
import type { Client, CreateClientDto } from '../types/client'
import { FilterRequest } from '../types/filter'

export function getClient(id: number) {
  return useApi<{ data: Client }>(`/api/clients/${id}`, {
    method: 'GET',
  })
}

export function getClients() {
  return useApi<{ data: Client[] }>(`/api/clients`, {
    method: 'GET',
  })
}

export async function getClientsWithFilters(payload?: FilterRequest) {
  return useApi<{ data: Client[] }>('/api/clients/filters', {
    method: 'POST',
    body: payload,
  })
}

export function createClient(dto: CreateClientDto) {
  return useApi<{ data: Client }>('/api/clients', {
    method: 'POST',
    body: dto,
  })
}

export function updateClient(id: number, dto: CreateClientDto) {
  return useApi<{ data: Client }>(`/api/clients/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteClient(id: number) {
  return useApi(`/api/clients/${id}`, {
    method: 'DELETE',
  })
}
