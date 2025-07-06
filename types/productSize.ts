export interface ProductSize {
  id: number
  product_id: number
  value: string
  barcode: string
  quantity: number
}

export interface SizeItem {
  id?:       number
  value:     string
  quantity:  number
  barcode:   string
}
export interface ProductSizeWithLabels {
  id: number
  product_id: number
  value: string
  barcode: string
  available_labels_count: number
}

export interface CreateProductSizeDto {
  product_id: number
  value:      string
  barcode:    string
}

export type UpdateProductSizeDto = CreateProductSizeDto
