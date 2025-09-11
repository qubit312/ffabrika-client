// composables/useApi.ts
import { defu } from 'defu'
import type { UseFetchOptions } from 'nuxt/app'
import { toValue, type MaybeRefOrGetter } from 'vue'

export const useApi: typeof useFetch = <T>(url: MaybeRefOrGetter<string>, options: UseFetchOptions<T> = {}) => {
  const config = useRuntimeConfig()
  const { currentClientId } = useCurrentClient()

  // токен только на клиенте
  const accessToken = process.client ? (localStorage.getItem('access_token') || '') : ''

  const defaults: UseFetchOptions<T> = {
    baseURL: config.public.apiBaseUrl,
    // ключ включает clientId, чтобы данные обновлялись при его смене
    key: `${toValue(url)}::client=${currentClientId.value ?? 'none'}`,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(currentClientId.value ? { 'X-Client-Id': String(currentClientId.value) } : {}),
    },
  }

  const params = defu(options, defaults)
  return useFetch(url, params)
}
