// /services/systemTexts.ts
import { useApi } from '@/composables/useApi'
import { isRef, unref } from 'vue'

export interface SystemText {
  id?: number
  key: string
  title: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface CreateSystemTextDto {
  key: string
  title: string
  content: string
}

export interface UpdateSystemTextDto {
  title?: string
  content?: string
}

function extract<T = any>(res: any): T {
  const r = isRef(res) ? unref(res) : res
  if (!r) return r as T
  if (Object.prototype.hasOwnProperty.call(r, 'data')) {
    const d = isRef(r.data) ? unref(r.data) : r.data
    return d as T
  }
  return r as T
}

function toArray<T = any>(body: any): T[] {
  const b = isRef(body) ? unref(body) : body
  if (!b) return []
  if (Array.isArray(b)) return b
  if (Array.isArray(b?.data)) return b.data
  if (Array.isArray(b?.data?.data)) return b.data.data
  return []
}

export async function listSystemTexts(): Promise<SystemText[]> {
  const res = await useApi('/api/system-texts', { method: 'GET' })
  const body = extract<any>(res)
  return toArray<SystemText>(body)
}

export async function getSystemText(key: string) {
  const res = await useApi(`/api/system-texts/${encodeURIComponent(key)}`, { method: 'GET' })
  const body = extract<any>(res)
  const b = isRef(body) ? unref(body) : body
  return (b?.data ?? b) as SystemText
}

export async function createSystemText(dto: CreateSystemTextDto) {
  const res = await useApi('/api/system-texts', { method: 'POST', body: dto })
  const body = extract<any>(res)
  const b = isRef(body) ? unref(body) : body
  return (b?.data ?? b) as SystemText
}

export async function updateSystemTextById(id: number, dto: UpdateSystemTextDto) {
  const res = await useApi(`/api/system-texts/${id}`, { method: 'PUT', body: dto })
  const body = extract<any>(res)
  const b = isRef(body) ? unref(body) : body
  return (b?.data ?? b) as SystemText
}

export async function deleteSystemTextById(id: number) {
  await useApi(`/api/system-texts/${id}`, { method: 'DELETE' })
}

