import { useApi } from '../composables/useApi'
import { FilterRequest } from '../types/filter'
import type { CreateWbProductDto, UpdateWbProductDto, WbProduct } from '../types/product'

export function createProduct(dto: CreateWbProductDto) {
  return useApi<{ data: WbProduct }>('/api/wb-products', {
    method: 'POST',
    body: dto
  })
}

export function updateProduct( dto: UpdateWbProductDto, id: number) {
  return useApi<{ data: WbProduct }>(`/api/wb-products/${id}`, {
    method: 'PUT',
    body: dto
  })
}

export function getProducts(clientId?: number, productId?: number, name?: string) {
  const params = new URLSearchParams()

  if (clientId) params.append('client_id', String(clientId))
  if (productId) params.append('product_id', String(productId))
  if (name) params.append('name', name)

  return useApi<{ data: WbProduct[] }>(`/api/wb-products?${params.toString()}`, {
    method: 'GET',
  })
}

export async function getProductsWithSizes(payload?: FilterRequest) {
  return useApi<{ data: WbProduct[] }>('/api/wb-products/sizes', {
    method: 'POST',
    body: payload,
  })
}

export async function getProductCategories(params?: URLSearchParams) {
  return useApi(`/api/marketplace-categories?${params}`, {
    method: 'GET',
  })
}

export function getProduct(id: number) {
  return useApi<WbProduct>(`/api/wb-products/${id}`, {
    method: 'GET'
  })
}

export function deleteProduct(id: number) {
  return useApi<void>(`/api/wb-products/${id}`, {
    method: 'DELETE'
  })
}
