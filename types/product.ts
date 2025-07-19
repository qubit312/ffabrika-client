export interface WbProduct {
  id: number
  created_by: number | null
  created_at: string
  updated_by: number | null
  updated_at: string
  name: string
  color: string
  article: string
  composition: string
  has_chestny_znak: boolean
  category: string
  client_id: number | null
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
