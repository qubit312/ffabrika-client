import { useApi } from '../composables/useApi'
import type { CreateProductDto, Product, UpdateProductDto } from '../types/product'

const token = localStorage.getItem('access_token') || ''
const bearerToken = token ? `Bearer ${token}` : ''
const headers = token ? { Authorization: bearerToken } : {}

export function createProduct(dto: CreateProductDto) {
  return useApi<{ data: Product }>('/api/products', {
    method: 'POST',
    body: dto,
    headers
  })
}

export function updateProduct(id: number, dto: UpdateProductDto) {
  return useApi<{ data: Product }>(`/api/products/${id}`, {
    method: 'PUT',
    body: dto,
    headers
  })
}

export function getProducts(clientId?: number) {
  const path = clientId
    ? `/api/products?client_id=${encodeURIComponent(clientId)}`
    : '/api/products'
  return useApi<{ data: Product[] }>(path, {
    method: 'GET',
    headers
  })
}

export function deleteProductById(id: number) {
  return useApi<void>(`/api/products/${id}`, {
    method: 'DELETE',
    headers
  })
}

// async function fetchProducts() {
//   let url = '/api/products'
//   if (primaryId != null && primaryId > 0) {
//     url += `?client_id=${encodeURIComponent(primaryId)}`
//   }
//   console.log(url)
//   const { data, error } = await useApi<Product[]>(url, {
//     method: 'GET',
//     headers: apiHeaders,
//   })
//   if (error.value) {
//     console.error('Ошибка при загрузке товаров:', error.value)
//     return
//   }
//   savedProducts.value = data.value || []
// }

// const deleteProduct = async (id: number) => {
//   try {
//     const { error } = await useApi(`/api/products/${id}`, {
//       method: 'DELETE',
//       headers: apiHeaders,
//     })
//     if (error.value) throw error.value
//     const idx = savedProducts.value.findIndex(item => item.id === id)
//     if (idx !== -1) {
//       savedProducts.value.splice(idx, 1)
//     }
//   }
//   catch (err: any) {
//     console.error('Ошибка при удалении метки:', err)
//   }
// }
