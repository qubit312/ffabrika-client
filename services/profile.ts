import { useApi } from '~/composables/useApi'
import type { ApiResponse, LoginPayload } from './auth'
import { saveProfileToStorage } from './auth'

export type ProfileApi = LoginPayload

export function getProfile() {
  return useApi<ApiResponse<ProfileApi>>('/api/profile', {
    method: 'GET',
    onResponse({ response }) {
      const body = response._data as ApiResponse<ProfileApi>
      if (body?.success && body.data) saveProfileToStorage(body.data)
    },
  })
}

export async function updateProfile(payload: Partial<ProfileApi>) {
  const res = await useApi<ApiResponse<ProfileApi>>('/api/profile', {
    method: 'PUT',          
    body: payload,         
  })

  const val = res.data?.value as ApiResponse<ProfileApi> | undefined
  if (val?.success && val.data) saveProfileToStorage(val.data)

  return res
}
