import { useApi } from '../composables/useApi'

export interface LabelTemplate {
  id: number
  name: string
  user_id: number | null
  content: string   // JSON строка
  is_system: boolean
  created_at: string
  updated_at: string
}

export function getLabelTemplates(userId: number | null = null) {
  return useApi<{ data: LabelTemplate[] }>('/api/label-templates', {
    method: 'GET',
    params: userId ? { user_id: userId } : {},
  })
}
