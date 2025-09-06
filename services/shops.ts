import { useApi } from '~/composables/useApi'

export type Shop = {
  id: number
  marketplace: 'wildberries' | 'ozon' | 'ym' | string
  name: string
  status?: 'active' | 'inactive' | 'error' | string
  created_at?: string
  updated_at?: string
}

export type CreateShopDto = {
  marketplace: string
  name: string
  token: string
}

export type UpdateShopDto = {
  name?: string
  token?: string   
}

export function getShops() {
  return useApi<{ success: boolean; data: Shop[] }|Shop[]>('/api/shops', { method: 'GET' })
}

export function createShop(dto: CreateShopDto) {
  return useApi<{ success: boolean; data: Shop; message?: string }>('/api/shops', {
    method: 'POST',
    body: dto,
  })
}

export function updateShop(id: number, dto: UpdateShopDto) {
  return useApi<{ success: boolean; data: Shop; message?: string }>(`/api/shops/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteShop(id: number) {
  return useApi<{ success: boolean; message?: string }>(`/api/shops/${id}`, {
    method: 'DELETE',
  })
}

export function checkShopConnection(id: number) {
  return useApi<{ success: boolean; status?: string; message?: string; data?: any }>(
    `/api/shops/${id}/check`,
    { method: 'POST' },
  )
}
