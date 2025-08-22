import { useApi } from '~/composables/useApi';

export type Role = { visible_name: string }
export type AuthUser = { name: string; role?: Role }
export type AuthPayload = { access_token: string } & AuthUser
export type ApiResponse<T> = { success: boolean; message?: string; data: T }

export type LoginDto = { email: string; password: string; remember?: boolean }
export type RegisterDto = {
  name: string
  email: string
  password: string
  password_repeat: string
}
export type ResetPasswordDto = { email: string } 

export function apiLogin(dto: LoginDto) {
  return useApi<ApiResponse<AuthPayload>>('/api/auth/login', {
    method: 'POST',
    body: dto,
  })
}

export function apiRegister(dto: RegisterDto) {
  return useApi<ApiResponse<AuthPayload | null>>('/api/auth/register', {
    method: 'POST',
    body: dto,
  })
}

export function apiResetPassword(dto: ResetPasswordDto) {
  return useApi<ApiResponse<null>>('/api/auth/reset-password', {
    method: 'POST',
    body: dto,
  })
}

export function setAuthSession(payload: AuthPayload) {
  localStorage.setItem('access_token', payload.access_token)
  const token = useCookie('access_token', { maxAge: 60 * 60 * 24 })
  token.value = payload.access_token

  if (payload.name) localStorage.setItem('user_name', payload.name)
  if (payload.role?.visible_name)
    localStorage.setItem('role_visible_name', payload.role.visible_name)
}
