export type FilterOperation = 'eq' | 'ne' | 'like'

export interface SimpleFilterRule {
  field: string
  op: FilterOperation
  value: string | number | boolean
}
export interface FilterGroup {
  group: 'and' | 'or'
  filters: FilterRule[]
}

export type FilterRule = SimpleFilterRule | FilterGroup
export interface FilterRequest {
  filters?: FilterRule[]
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
  group_by_size?: boolean
}
