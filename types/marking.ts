import type { Client } from './client'
import type { Product } from './product'

export type ShortEntityParams = {
  id: number | null
  name: string | null
}

export interface Marking {
  id: number
  product_id: number | null
  client_id: number | null
  article: string
  name: string
  composition: string
  color: string
  has_chestny_znak: boolean
  category: string
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null

  product?: Product
  client?: Client
  creator?: any
  editor?: any
}
