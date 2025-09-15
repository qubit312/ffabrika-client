<script setup lang="ts">
import { useCurrentClient } from '@/composables/useCurrentClient';
import { useRoute, useRouter } from 'nuxt/app';
import { computed, onMounted, ref, watch } from 'vue';

const { clients, currentClient, setClient, loadClients } = useCurrentClient()
const router = useRouter()
const route = useRoute()

type Client = { id: string | number; name: string }
const selectedClient = ref<Client | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Items для VSelect
const items = computed(() => clients.value)

// Синхронизируем с глобальным состоянием
watch(currentClient, (newClient) => {
  selectedClient.value = newClient
}, { immediate: true })

// Кастомная загрузка клиентов
const loadClientsCustom = async () => {
  loading.value = true
  error.value = null
  
  try {
    await loadClients()
    
    // Если клиенты загружены, но текущий не выбран - выбираем первого
    if (clients.value.length > 0 && !currentClient.value) {
      setClient(clients.value[0].id)
    }
  } catch (e: any) {
    error.value = e.message || 'Ошибка загрузки клиентов'
    console.error('Ошибка загрузки клиентов:', e)
  } finally {
    loading.value = false
  }
}

// Обработчик изменения
function onChange(client: any) {
  if (client) {
    setClient(client.id)
    
    if (route.path === '/product/list') {
      window.location.reload()
    } else {
      router.push('/product/list')
    }
  }
}

// Загружаем при монтировании
onMounted(() => {
  if (clients.value.length === 0) {
    loadClientsCustom()
  }
})

// Функция для ручной перезагрузки
const reloadClients = () => {
  loadClientsCustom()
}
</script>

<template>
  <VSelect
    :items="items"
    v-model="selectedClient"
    density="comfortable"
    variant="outlined"
    hide-details
    item-title="name"
    item-value="id"
    :loading="loading"
    :error="!!error"
    :error-messages="error"
    style="min-width: 180px; max-width: 250px;"
    return-object
    @update:model-value="onChange"
  >
    <template #prepend-item>
      <VListItem v-if="loading" title="Загрузка..." />
      <VListItem v-else-if="error" :title="error" />
      <VListItem v-else-if="items.length === 0" title="Нет доступных организаций" />
    </template>
    <template #no-data>
    </template>
  </VSelect>
</template>
