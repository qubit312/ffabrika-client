export interface Client {
  id: number
  name: string
  type: string
  is_fulfillment: boolean
  phone: string
  email: string
  telegram: string
  tin: string
  psrn: string
  account: string
  bank: string
  correspondent_account: string
  bic: string
  legal_address: string
  vat: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateClientDto {
  name: string;
  short_name: string;
  type: string;
  email: string;
  phone: string;
  telegram: string;
  tin: string;
  psrn: string;
  account: string;
  bank: string;
  correspondent_account: string;
  bic: string;
  legal_address: string;
  short_address: string,
  vat: number;
}

export type UpdateClientDto = CreateClientDto;
