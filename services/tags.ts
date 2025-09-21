import { useApi } from '~/composables/useApi'

export type Tag = {
  id: number
  name: string
  type: 'custom' | 'system' | string
  color?: string
}

type TagsListResponse = {
  success?: boolean
  data: Tag[]
}

export function getTags() {
  return useApi<TagsListResponse>('/api/tags', { method: 'GET' })
}

export function getTag(id: number) {
  return useApi<Tag>(`/api/tags/${id}`, { method: 'GET' })
}

export function createTag(dto: { name: string; type?: string; color?: string }) {
  return useApi<{ success?: boolean; data: Tag }>(
    '/api/tags',
    { method: 'POST', body: dto }
  )
}

export function updateTag(id: number, dto: { name: string; type?: string; color?: string }) {
  return useApi<{ success?: boolean; data: Tag }>(
    `/api/tags/${id}`,
    { method: 'PUT', body: dto }
  )
}

export function deleteTag(id: number) {
  return useApi<{ success?: boolean }>(
    `/api/tags/${id}`,
    { method: 'DELETE' }
  )
}

export function getProductTagIds(productId: number) {
  return useApi<TagsListResponse>(
    `/api/tags/wb_products/${productId}`,
    { method: 'GET' }
  )
}

export function attachProductTags(productId: number, tagIds: number[]) {
  return useApi<{ success?: boolean }>(
    `/api/tags/wb_products/${productId}/attach`,
    { method: 'POST', body: { tag_ids: tagIds } }
  )
}

export function detachProductTags(productId: number, tagIds: number[]) {
  return useApi<{ success?: boolean }>(
    `/api/tags/wb_products/${productId}/detach`,
    { method: 'POST', body: { tag_ids: tagIds } }
  )
}
