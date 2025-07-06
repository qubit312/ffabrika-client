import { useApi } from '../composables/useApi'
import type { CreateProductSizeDto, ProductSize, UpdateProductSizeDto } from '../types/productSize'

export function createProductSize(dto: CreateProductSizeDto) {
  return useApi<{ data: ProductSize }>('/api/product-sizes', {
    method: 'POST',
    body: dto
  })
}

export function updateProductSize(id: number, dto: UpdateProductSizeDto) {
  return useApi<{ data: ProductSize }>(`/api/product-sizes/${id}`, {
    method: 'PUT',
    body: dto
  })
}

export function getProductSizes(productId: number) {
  return useApi<{ data: ProductSize }>('/api/product-sizes', {
    method: 'GET',
    params: { product_id: productId },
  })
}

export function deleteProductSize(id: number) {
  return useApi(`/api/product-sizes/${id}`, {
    method: 'DELETE',
  })
}
