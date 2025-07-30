export type FilterOperation = 'eq' | 'ne' | 'like'

export interface FilterRule {
  field: string
  op: FilterOperation
  value: string | number | boolean
}

export interface FilterRequest {
  filters?: FilterRule[]
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
