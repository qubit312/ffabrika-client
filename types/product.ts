export interface WbProduct {
  id: number
  created_by: number
  created_at: string
  updated_by: number
  updated_at: string
  name: string
  color: string
  article: string
  composition: string
  category: string
  client_id: number
}

export interface CreateWbProductDto {
  name: string
  color: string
  article: string
  composition: string
  category: string | null
  client_id: number | null
}

export type UpdateWbProductDto = CreateWbProductDto;
