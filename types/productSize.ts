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
  available_labels_count: number
}

export type CreateProductSizeDto = ProductSizeBase
export type UpdateProductSizeDto = ProductSizeBase
