import { useApi } from '../composables/useApi'
import type { Label } from '../types/label'
import type { LabelsResponse } from '../types/markingsResponse'

export async function getLabel(id: number) {
  return await useApi<Label>(`/api/labels/${id}`, { 
    method: 'GET'
  })
}

export async function getLabels () {
  return await useApi<LabelsResponse>(`/api/labels`, {
    method: 'GET'
  })
}

export async function createLabel(payload: any) {
  return await useApi<Label>('/api/labels', {
    method: 'POST',
    body: payload
  })
}

export async function updateLabel(id: number, payload: any) {
  return await useApi<Label>(`/api/labels/${id}`, { 
    method: 'PUT', 
    body: payload
  })
}

export async function removeLabel(id: number) {
  return await useApi<void>(`/api/labels/${id}`, {
    method: 'DELETE'
  })
}
