import { useApi } from '../composables/useApi'
import type { Client, CreateClientDto } from '../types/client'

const token = localStorage.getItem('access_token') || ''
const bearerToken = token ? `Bearer ${token}` : ''
const headers = token ? { Authorization: bearerToken } : {}

export function getClient(id: number) {
  return useApi<{ data: Client }>(`/api/clients/${id}`, {
    method: 'GET',
    headers
  })
}

export function getClients() {
  return useApi<{ data: Client[] }>(`/api/clients`, {
    method: 'GET',
    headers
  })
}

export function createClient(dto: CreateClientDto) {
  return useApi<{ data: Client }>('/api/clients', {
    method: 'POST',
    body: dto,
    headers
  })
}

export function updateClient(id: number, dto: CreateClientDto) {
  return useApi<{ data: Client }>(`/api/clients/${id}`, {
    method: 'PUT',
    body: dto,
    headers
  })
}

// async function onSubmit() {
//   isLoading.value = true
//   const url = mode.value === 'edit' ? `/api/clients/${primaryId}` : '/api/clients'
//   const method = mode.value === 'edit' ? 'PUT' : 'POST'
//   const { data, error } = await useApi<any>(url, {
//     method,
//     headers,
//     body: buildSubmitPayload(form.value),
//   })
//   if (error.value) {
//     snackColor.value = 'error'
//     snackMessage.value = 'Ошибка сохранения клиента'
//   } else {
//     snackColor.value = 'success'
//     snackMessage.value = mode.value === 'edit' ? 'Клиент обновлён' : 'Клиент создан'
//     if (mode.value === 'create') {
//       router.push({ name: 'client-details-id', params: { id: data.value.data.id } })
//     }
//   }
//   snackbar.value = true
//   isLoading.value = false
// }
