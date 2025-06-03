export interface ClientParams {
  id?: number
  name?: string
  type?: string
  phone?: string
  email?: string
  telegram?: string | null
  details?: {key: string, value: string}[]
  tin?: string
  psrn?: string
  account?: string
  bank?: string
  correspondent_account?: string
  bic?: string
  legal_address?: string
  vat?: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface ClientOption {
  id: number
  name: string
}
