export enum MarketplacePlatform {
  WB = 'WB',
}

export enum MarketplaceAccountStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PENDING = 'pending',
  ERROR = 'error',
  EXPIRED = 'expired',
  LIMITED = 'limited',
  SUSPENDED = 'suspended',
  NOT_CONFIGURED = 'not_configured'
}

export type AccountStatus = keyof typeof MarketplaceAccountStatus | string;

export interface MarketplaceAccount {
  id: number;
  client_id: number;
  platform: MarketplacePlatform;
  name: string;
  status?: MarketplaceAccountStatus;
  error_message?: string | null;
  last_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMarketplaceAccountDto {
  platform: MarketplacePlatform;
  name: string;
  api_token_enc: string;
  status?: MarketplaceAccountStatus;
  error_message?: string;
}

export interface UpdateMarketplaceAccountDto {
  platform?: MarketplacePlatform;
  name?: string;
  api_token_enc?: string;
  status?: MarketplaceAccountStatus;
  error_message?: string | null;
  last_checked_at?: string;
}

export interface CheckConnectionResponse {
  success: boolean;
  message: string;
}
