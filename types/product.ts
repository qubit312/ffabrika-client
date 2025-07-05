export interface Product {
  id: number
  order_id: number
  parent_id: number | null
  name: string
  qty: number
  color: string
  size: string[]
  complect: number
  delivered: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateProductDto {
  client_id: number
  order_id: number
  name: string
  qty: number
  color: string
  size: string[]
}

export type UpdateProductDto = CreateProductDto;
