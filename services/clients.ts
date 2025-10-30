import { useApi } from '../composables/useApi'
import type { Client, CreateClientDto } from '../types/client'
import type { FilterRequest } from '../types/filter'

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

export function getFullfilments(showLinked: boolean) {
  return useApi<{ success: boolean, data: Client[] }>(`/api/clients/ff`, {
    method: 'GET',
    params: { show_linked: showLinked },
  })
}

export async function getClientsWithFilters(payload?: FilterRequest) {
  return useApi<{ data: Client[] }>('/api/clients/filters', {
    method: 'POST',
    body: payload,
  })
}

export function updateClient(id: number, dto: CreateClientDto) {
  console.log('updateClient')
  return useApi<{ data: Client }>(`/api/clients/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function setFulfillment(id: number) {
  return useApi(`/api/clients/${id}/set-fulfillment`, {
    method: 'PATCH',
  })
}
