import { useApi } from '../composables/useApi'
import type { CreatePrinterDto, Printer } from '../types/printer'

export function getPrinter(id: number) {
  return useApi<{ data: Printer }>(`/api/printers/${id}`, {
    method: 'GET',
  })
}

export function getPrinters() {
  return useApi<{ data: Printer[] }>(`/api/printers`, {
    method: 'GET',
  })
}

export function createPrinter(dto: CreatePrinterDto) {
  return useApi<{ data: Printer }>('/api/printers', {
    method: 'POST',
    body: dto,
  })
}

export function updatePrinter(id: number, dto: CreatePrinterDto) {
  return useApi<{ data: Printer }>(`/api/printers/${id}`, {
    method: 'PUT',
    body: dto,
  })
}

export function deletePrinter(id: number) {
  return useApi(`/api/printers/${id}`, {
    method: 'DELETE',
  })
}

export function syncPrinterCount(id: number) {
  return useApi<{ data: Printer }>(`/api/printers/${id}/sync-count`, {
    method: 'POST',
  })
}
