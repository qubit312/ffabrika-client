export interface ProductSizeBase {
  value: string
  tech_size: string
  barcode: string
  product_id: number
}

export interface ProductSize extends ProductSizeBase {
  id: number
}

export interface ProductSizeWithLabels extends ProductSize {
  total_count: number
  available_count: number
  used_count: number
}

export type CreateProductSizeDto = ProductSizeBase
export type UpdateProductSizeDto = ProductSizeBase
