export interface Client {
  id: number
  name: string
  type: string
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
  vat: string;
}

export type UpdateClientDto = CreateClientDto;
