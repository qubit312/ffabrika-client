import { useApi } from '../composables/useApi'

export interface CreateLabelsDto {
  size_id: number
  count:   number
}

export function updateChzLabels(dto: CreateLabelsDto) {
  return useApi<void>('/api/labels', {
    method: 'POST',
    body: { ...dto },
    lazy: true,
  })
}
