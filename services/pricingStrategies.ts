import { useApi } from '@/composables/useApi';
import type { FilterRequest } from '@/types/filter';
import type {
  AddStrategyItemDto,
  CreateStrategyDto,
  PricingStrategy,
  RunStrategyResponse,
  StrategyItem,
  UpdateStrategyDto,
  UpdateStrategyItemDto,
  UpdateStrategyItemTimeDto
} from '@/types/pricingStrategy';

export function getStrategies(params?: { type?: string; status?: string; perPage?: number }) {
  return useApi<{ data: PricingStrategy[] }>('/api/pricing-strategies', {
    method: 'GET',
    params,
  })
}

export function getStrategy(id: number) {
  return useApi<{ data: PricingStrategy }>(`/api/pricing-strategies/${id}`, {
    method: 'GET',
  })
}

export function createStrategy(dto: CreateStrategyDto) {
  return useApi<{ data: PricingStrategy }>('/api/pricing-strategies', {
    method: 'POST',
    body: dto,
  })
}

export function updateStrategy(id: number, dto: UpdateStrategyDto) {
  return useApi<{ data: PricingStrategy }>(`/api/pricing-strategies/${id}`, {
    method: 'PATCH',
    body: dto,
  })
}

export function deleteStrategy(id: number) {
  return useApi(`/api/pricing-strategies/${id}`, {
    method: 'DELETE',
  })
}

export function runStrategy(id: number, wbToken?: string) {
  return useApi<RunStrategyResponse>(`/api/pricing-strategies/${id}/run`, {
    method: 'POST',
    body: { wbToken },
  })
}

export function getStrategyItems(id: number, payload?: FilterRequest) {
  return useApi<{ data: StrategyItem[] }>(`/api/pricing-strategies/${id}/get-items`, {
    method: 'POST',
    body: payload,
  })
}

export function getAvailableStrategyItems(id: number, payload?: FilterRequest) {
  return useApi<{ data: StrategyItem[] }>(`/api/pricing-strategies/${id}/available-items`, {
    method: 'POST',
    body: payload,
  })
}

export function addStrategyItems(id: number, items: AddStrategyItemDto[]) {
  return useApi<{ added: number }>(`/api/pricing-strategies/${id}/add-items`, {
    method: 'POST',
    body: { items },
  })
}

export function updateStrategyItem(id: number, data: Partial<UpdateStrategyItemDto>) {
  return useApi<{ success: boolean }>(`/api/strategy-items/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

export function updateStrategyItemTime(id: number, data: UpdateStrategyItemTimeDto) {
  return useApi<{ updated: number }>(`/api/pricing-strategies/${id}/update-time`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteStrategyItem(id: number) {
  return useApi<{ success: boolean }>(`/api/strategy-items/${id}`, {
    method: 'DELETE',
  })
}
