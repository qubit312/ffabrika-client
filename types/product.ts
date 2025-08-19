import type { ProductSize } from "./productSize"

export interface WbProduct {
  sizes: any
  id: number
  created_by: number | null
  created_at: Date
  updated_by: number | null
  updated_at: Date
  name: string
  color: string
  article: string
  composition: string
  has_chestny_znak: boolean
  category: string
  client_id: number | null
  productSizes?: ProductSize[];
}

export interface CreateWbProductDto {
  name: string
  color: string
  article: string
  composition: string
  has_chestny_znak: boolean
  category: string | null
  client_id: number | null
}

export type UpdateWbProductDto = CreateWbProductDto;
