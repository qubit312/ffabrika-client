import { useApi } from '../composables/useApi'
import type { CheckConnectionResponse, CreateMarketplaceAccountDto, MarketplaceAccount, UpdateMarketplaceAccountDto } from '../types/marketplaceAccount'

export function getMarketplaceAccount(id: number) {
  return useApi<{ data: MarketplaceAccount }>(`/api/marketplace-accounts/${id}`, {
    method: 'GET',
  })
}

export function getMarketplaceAccounts() {
  return useApi<{ data: MarketplaceAccount[] }>(`/api/marketplace-accounts`, {
    method: 'GET',
  })
}

export function createMarketplaceAccount(dto: CreateMarketplaceAccountDto) {
  return useApi<{ data: MarketplaceAccount }>('/api/marketplace-accounts', {
    method: 'POST',
    body: dto,
  })
}

export function checkConnection(id: number) {
  return useApi<CheckConnectionResponse>(`/api/marketplace-accounts/check-connection/${id}`, {
    method: 'POST',
  })
}

export function updateMarketplaceAccount(id: number, dto: UpdateMarketplaceAccountDto) {
  return useApi<{ data: MarketplaceAccount }>(`/api/marketplace-accounts/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deleteMarketplaceAccount(id: number) {
  return useApi(`/api/marketplace-accounts/${id}`, {
    method: 'DELETE',
  })
}

export function importWbProduct(dto: {'marketplace_account_id': number}) {
  return useApi(`/api/wb/import-product`, {
    method: 'POST',
    body: dto
  })
}
