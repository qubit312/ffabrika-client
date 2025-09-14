import { useState } from 'nuxt/app';
import { computed, onMounted, watch } from 'vue';
import { useApi } from './useApi';

type Client = { id: string | number; name: string }

const LS_KEY = 'current_client_id'

export function useCurrentClient() {
  const clients = useState<Client[]>('clients', () => [])
  const currentClientId = useState<string | number | null>('currentClientId', () => null)

  const currentClient = computed<Client | null>(() =>
    clients.value.find(c => String(c.id) === String(currentClientId.value ?? '')) ?? null
  )

  async function loadClients() {
    const { data, error } = await useApi<Client[]>('/api/client-users/clients', {
      method: 'GET'
    })
    if (!error.value && data.value) {
      clients.value = data.value
      
      // Если текущий клиент не установлен, пытаемся восстановить из localStorage или берем первого
      if (!currentClientId.value) {
        const saved = process.client ? window.localStorage.getItem(LS_KEY) : null
        // const saved = process.client
        if (saved) {
          currentClientId.value = saved
        } else if (data.value.length > 0) {
          currentClientId.value = data.value[0]?.id ?? null
        }
      }
    }
  }

  function setClient(id: string | number | null) {
    currentClientId.value = id
  }

  function loadFromStorage() {
    if (!process.client) return
    const saved = window.localStorage.getItem(LS_KEY)
    if (saved) {
      currentClientId.value = saved
    }
  }

  // Автоматически сохраняем в localStorage при изменении
  if (process.client) {
    watch(
      currentClientId,
      val => {
        if (val != null) {
          window.localStorage.setItem(LS_KEY, String(val))
        }
      },
      { immediate: true }
    )
  }

  function clearClient() {
    currentClientId.value = null
    clients.value = []
    if (process.client) {
      window.localStorage.removeItem(LS_KEY)
    }
  }

  // Загружаем при инициализации
  onMounted(() => {
    loadFromStorage()
    if (clients.value.length === 0) {
      void loadClients()
    }
  })

  return {
    clients: computed(() => clients.value),
    currentClientId: computed(() => currentClientId.value),
    currentClient: computed(() => currentClient.value),
    loadClients,
    setClient,
    loadFromStorage,
    clearClient,
  }
}
