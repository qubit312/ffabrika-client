export interface Brand {
  id: number
  name: string
  client_id: number
}

export interface CreateBrandDto {
  name: string
  client_id: number
}

export type UpdateBrandDto = CreateBrandDto;
