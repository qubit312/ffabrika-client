import { useApi } from '../composables/useApi'

export interface ProductImage {
  id: number
  product_id: number
  url: string
  alt?: string
  position: number
  type: string
  width?: number
  height?: number
  storage: string
}

export function getProductImages(productId: number) {
  return useApi<{ data: ProductImage[] }>(`/api/products-img/${productId}`, {
    method: 'GET',
  })
}

export function getProductMainImage(productId: number) {
  return useApi<{ data: ProductImage }>(`/api/products-img/${productId}`, {
    method: 'GET',
  })
}
