import { useApi } from '../composables/useApi';

interface ProductSize {
  id: number
  product_id: number
  value: string
  barcode: string
  printable_label_count: number
}

interface PaginatedResponse<T> {
  data: T[]
}

export interface CreateLabelsDto {
  size_id: number
  count:   number
}

interface ReplaceSizeResponse {
  message: string;
  updated_count: number;
}

export function updateChzLabels(dto: CreateLabelsDto) {
  return useApi<void>('/api/labels', {
    method: 'POST',
    body: { ...dto },
    lazy: true,
  })
}

export function getProductSizes(productId: number) {
  return useApi<PaginatedResponse<ProductSize>>('/api/product-sizes', {
    method: 'GET',
    params: { product_id: productId },
  })
}

export function replaceProductSize(dto: {
  old_size_id: number
  new_size_id: number
  quantity: number
}) {
  return useApi<ReplaceSizeResponse>('/api/chestny-znak-labels/replace-size', {
    method: 'POST',
    body: dto
  })
}

export function importChestnyZnakLabels(formData: FormData) {
  return useApi<PaginatedResponse<ProductSize>>(
    '/api/chestny-znak-labels/import',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    }
  )
}

export function markLabelsAsDefective(ids: number[], reason: string) {
  return useApi<{
    success: boolean
    message?: string
    data?: any[]
  }>('/api/chestny-znak-labels/defective', {
    method: 'POST',
    body: { ids, reason }
  })
}

export interface ChestnyZnakLabel {
  id: number
  size_id: number
  code: string
  used: boolean
  created_at: string
  updated_at: string
}

export function getChestnyZnakLabels(params?: { size_id?: number; used?: boolean; per_page?: number; page?: number }) {
  return useApi<PaginatedResponse<ChestnyZnakLabel>>('/api/chestny-znak-labels', {
    method: 'GET',
    params,
  })
}
