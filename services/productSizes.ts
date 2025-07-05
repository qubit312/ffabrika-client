import { useApi } from '../composables/useApi'
import type { CreateProductSizeDto, ProductSize, UpdateProductSizeDto } from '../types/productSize'

const token = localStorage.getItem('access_token') || ''
const bearerToken = token ? `Bearer ${token}` : ''
const headers = token ? { Authorization: bearerToken } : {}

export function createProductSize(dto: CreateProductSizeDto) {
  return useApi<{ data: ProductSize }>('/api/product-sizes', {
    method: 'POST',
    body: dto,
    headers
  })
}

export function updateProductSize(id: number, dto: UpdateProductSizeDto) {
  return useApi<{ data: ProductSize }>(`/api/product-sizes/${id}`, {
    method: 'PUT',
    body: dto,
    headers
  })
}
