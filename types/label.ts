import type { WbProduct } from './product'

export type ShortEntityParams = {
  id: number | null
  name: string | null
}

export interface Label {
  id: number
  product_id: number | null
  name: string
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null

  product?: WbProduct
  creator?: any
  editor?: any
}

export interface CreateLabelDto {
  product_id: number
  name: string
}
