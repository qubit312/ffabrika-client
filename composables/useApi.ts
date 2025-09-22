import { defu } from 'defu'
import type { UseFetchOptions } from 'nuxt/app'
import { toValue, type MaybeRefOrGetter } from 'vue'

const getErrorMessage = (response: any): string => {
  if (response.status === 403) {
    return response._data?.permission?.visible_name || ''
  }
  
  return ''
}

export const useApi: typeof useFetch = <T>(url: MaybeRefOrGetter<string>, options: UseFetchOptions<T> = {}) => {
  const config = useRuntimeConfig()
  const { currentClientId } = useCurrentClient()
  const permissionsModal = usePermissionsModal()

  const accessToken = process.client ? (localStorage.getItem('access_token') || '') : ''

  const defaults: UseFetchOptions<T> = {
    baseURL: config.public.apiBaseUrl,

    key: `${toValue(url)}::client=${currentClientId.value ?? 'none'}`,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(currentClientId.value ? { 'X-Client-Id': String(currentClientId.value) } : {}),
    },

    onResponseError({ response }) {
      if (response.status === 403 || response.status === 401) {
        const errorData = {
          code: response.status,
          title: response.status === 403 ? 'Недостаточно прав' : 'Неавторизованный доступ',
          message: getErrorMessage(response),
        }
        
        permissionsModal.show(errorData)
      }
      
      options.onResponseError?.(response)
    }
  }
  
  const params = defu(options, defaults)
  return useFetch(url, params)
}
