import { useApi } from '~/composables/useApi';
import type { ApiResponse, LoginPayload } from './auth';
import { saveProfileToStorage } from './auth';

export type ProfileApi = LoginPayload

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}
export function getProfile() {
  return useApi<ApiResponse<ProfileApi>>('/api/profile', {
    method: 'GET',
    onResponse({ response }) {
      const body = response._data as ApiResponse<ProfileApi>
      if (body?.success && body.data) saveProfileToStorage(body.data)
    },
  })
}

export function changePassword(payload: ChangePasswordRequest) {
  return useApi<ChangePasswordResponse>('/api/change-password', {
    method: 'POST',
    body: payload,
  });
}

export function sendVerificationEmail() {
  return useApi('/api/profile/send-verification-email', {
    method: 'GET',
  });
}

export function verifyEmail(payload: { token: string; email: string }) {
  return useApi('/api/profile/verify-email', {
    method: 'POST',
    body: payload,
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
