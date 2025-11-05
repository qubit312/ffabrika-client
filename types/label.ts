import type { Printer } from './printer'
import type { WbProduct } from './product'

export type ShortEntityParams = {
  id: number | null
  name: string | null
}

export interface Label {
  id: number
  product_id: number | null
  printer_id: number | null
  name: string
  client_name: string | null;
  print_single_ean13: boolean;
  print_double_ean13: boolean;
  duplicate_chz: boolean;
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null

  product?: WbProduct
  printer?: Printer
  creator?: any
  editor?: any
}

export interface CreateLabelDto {
  product_id: number
  name: string
}

export interface NewLabelInterface {
  id: number
  name: string
  brand: string
  product_id: number
  product: WbProduct | null
  printer_id: number | null
  client_name: string
  print_single_ean13: boolean
  print_double_ean13: boolean
  duplicate_chz: boolean
  label_template_id: number
  size_display_type: string
  manufacturer: string
  manufacture_date: string | null
  country: string
}
