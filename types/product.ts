import type { Brand } from "./brand"
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
  vendor_code: string
  main_image_url?: string
  composition: string
  has_chestny_znak: boolean
  is_wb_import: boolean
  wb_category: { id: number, name: string, parent: { id: number, name: string } | null } | null
  client_id: number | null
  brand_id: number | null
  brand: Brand | null
  stock?: string
  productSizes?: ProductSize[];
  tags?: ProductTag[]
  labels: ProductLabel[]
}

export type ProductLabel = {
  id: number
  product_id: number
  name: string
}

export type ProductTag = {
  id: number
  name: string
  color?: string
}

export interface CreateWbProductDto {
  name: string
  color: string
  article: string
  vendor_code: string
  composition: string
  has_chestny_znak: boolean
  category_id: number | null 
  client_id: number | null
  brand_id: number | null
  tags?: number[]
}

export type UpdateWbProductDto = CreateWbProductDto;
