import { useApi } from '../composables/useApi'
import type { Brand, CreateBrandDto } from '../types/brand'

export function getBrand(id: number) {
  return useApi<{ data: Brand }>(`/api/brands/${id}`, {
    method: 'GET',
  })
}

export function getBrands() {
  return useApi<{ data: Brand[] }>(`/api/brands`, {
    method: 'GET',
  })
}

export function createBrand(dto: CreateBrandDto) {
  return useApi<{ data: Brand }>('/api/brands', {
    method: 'POST',
    body: dto,
  })
}

export function updateBrand(id: number, dto: CreateBrandDto) {
  return useApi<{ data: Brand }>(`/api/brands/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteBrand(id: number) {
  return useApi(`/api/brands/${id}`, {
    method: 'DELETE',
  })
}
