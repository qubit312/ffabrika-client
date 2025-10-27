export type StrategyStatus = 'draft' | 'active' | 'paused'
export type StrategyType = 'time_discount'

export interface PricingStrategy {
  id: number
  name: string
  type: StrategyType
  status: StrategyStatus
  order_by_field?: string
  order_direction?: 'asc' | 'desc'
  items_count?: number
  created_by?: number
  updated_by?: number
  created_at?: string
  updated_at?: string
}

export interface CreateStrategyDto {
  name: string
  type?: StrategyType
  status?: StrategyStatus
  order_by_field?: string
  order_direction?: 'asc' | 'desc'
}

export interface UpdateStrategyDto extends Partial<CreateStrategyDto> {}

export interface StrategyItemProduct {
  id: number
  article: string
  vendor_code: string
  name: string
  color?: string
  image?: string
  category?: string
  category_name?: string
  stock?: number
  discount?: number
}

export interface StrategyItem {
  id: number
  status: 'active' | 'paused' | 'applied'
  discount: number
  temp_discount: number
  starts_at: string
  ends_at: string
  total_qty: number
  product: StrategyItemProduct | null
}

export interface UpdateStrategyItemDto {
  temp_discount: number
  starts_at: string
  ends_at: string
  status: 'active' | 'paused'
}

export interface UpdateStrategyItemTimeDto {
  field: string
  value: string
}

export interface AddStrategyItemDto {
  model_id: number
}

export interface RunStrategyResponse {
  strategyId: number
  status: string
  applied: number
  skipped: number
  message?: string
  error?: string
}
