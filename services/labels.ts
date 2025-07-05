import { useApi } from '../composables/useApi'
import type { Marking } from '../types/marking'
import type { MarkingsResponse } from '../types/markingsResponse'

const token = localStorage.getItem('access_token') || ''
const bearerToken = token ? `Bearer ${token}` : ''
const headers = token ? { Authorization: bearerToken } : {}

export async function getLabel(id: number) {
  return await useApi<Marking>(`/api/labels/${id}`, { 
    method: 'GET',
    headers
  })
}

export async function getLabels () {
  return await useApi<MarkingsResponse>(`/api/labels`, {
    method: 'GET',
    headers,
  })
}

export async function createLabel(payload: any) {
  return await useApi<Marking>('/api/labels', {
    method: 'POST',
    body: payload,
    headers
  })
}

export async function updateLabel(id: number, payload: any) {
  return await useApi<Marking>(`/api/labels/${id}`, { 
    method: 'PUT', 
    body: payload, 
    headers 
  })
}

export async function removeLabel(id: number) {
  return await useApi<void>(`/api/labels/${id}`, {
    method: 'DELETE',
    headers,
  })
}
