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


export interface CreateProductSizeDto {
  product_id: number
  value:      string
  barcode:    string
}

export type UpdateProductSizeDto = CreateProductSizeDto
