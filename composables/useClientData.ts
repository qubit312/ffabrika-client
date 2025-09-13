import { onMounted, onUnmounted, ref } from 'vue'
import { useCurrentClient } from './useCurrentClient'

export const useClientData = <T>(url: string, immediate = true) => {
  const client = useCurrentClient()
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadData = async () => {
    if (!client.hasSelectedClient.value) {
      data.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data: responseData, error: responseError } = await useApi<T>(url)
      
      if (responseError.value) {
        throw new Error(responseError.value.message || 'API error')
      }
      
      data.value = responseData.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading data:', err)
    } finally {
      loading.value = false
    }
  }

  const handleClientChange = () => {
    if (immediate) {
      loadData()
    }
  }

  onMounted(() => {
    window.addEventListener('client-changed', handleClientChange)
    if (immediate && client.hasSelectedClient.value) {
      loadData()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('client-changed', handleClientChange)
  })

  return {
    data,
    loading,
    error,
    loadData,
    refresh: loadData
  }
}
