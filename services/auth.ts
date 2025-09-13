import { useApi } from '~/composables/useApi';

export type Role = { name?: string; visible_name?: string }
export type LoginPayload = {
  access_token?: string
  token_type?: string
  id?: number
  name?: string
  email?: string
  phone?: string
  address?: string
  avatar?: string
  role?: Role
  roles?: Role[]
  permissions?: any[]
}
export type ApiResponse<T> = { success: boolean; message?: string; data: T }
export type LoginDto = { email: string; password: string; remember?: boolean }
export type RegisterDto = { name: string; email: string; password: string; password_repeat: string }
export type ResetPasswordDto = { email: string }

// ――― helpers
const jsonHeaders = { 'Content-Type': 'application/json' }
const trim = (s?: string | null) => String(s ?? '').trim()

export function apiLogin(dto: LoginDto) {
  const payload = { ...dto, email: trim(dto.email).toLowerCase() }
  return useApi<ApiResponse<LoginPayload>>('/api/auth/login', {
    method: 'POST',
    body: payload,
    headers: jsonHeaders,
  })
}

export function apiRegister(dto: RegisterDto) {
  const payload = {
    name: trim(dto.name),
    email: trim(dto.email).toLowerCase(),
    password: dto.password, 
  }
  return useApi<ApiResponse<{ access_token?: string; token_type?: string }>>('/api/auth/register', {
    method: 'POST',
    body: payload,
    headers: jsonHeaders,
  })
}

export function apiResetPassword(dto: ResetPasswordDto) {
  const payload = { email: trim(dto.email).toLowerCase() }
  return useApi<ApiResponse<null>>('/api/auth/request-password', {
    method: 'POST',
    body: payload,
    headers: jsonHeaders,
  })
}

export type ConfirmResetDto = {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export function apiConfirmReset(dto: ConfirmResetDto) {
  const payload = {
    token: dto.token,
    email: String(dto.email ?? '').trim().toLowerCase(),
    password: dto.password,
    password_confirmation: dto.password_confirmation,
  }
  return useApi<ApiResponse<null>>('/api/auth/reset-password', {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  })
}


function toStorageUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const cfg = useRuntimeConfig()
  const origin = cfg.public?.backendOrigin || 'http://127.0.0.1:8000'
  return `${origin}/storage/${String(path).replace(/^\/+/, '')}`
}

export function saveProfileToStorage(u: Partial<LoginPayload>) {
  if (!u) return
  if (u.id != null) localStorage.setItem('user_id', String(u.id))
  if (u.name) localStorage.setItem('user_name', u.name)
  if (u.email) localStorage.setItem('user_email', u.email)
  if (u.phone) localStorage.setItem('user_phone', u.phone)
  if (u.address) localStorage.setItem('user_address', u.address)
  if (u.role?.visible_name) localStorage.setItem('role_visible_name', u.role.visible_name)

  if (u.avatar) {
    localStorage.setItem('user_avatar', u.avatar)
    const url = toStorageUrl(u.avatar)
    if (url) localStorage.setItem('user_avatar_url', url)
  }
}

export function setAuthSession(payload: LoginPayload) {
  if (payload.access_token) {
    localStorage.setItem('access_token', payload.access_token)
    const token = useCookie('access_token', { maxAge: 60 * 60 * 24 })
    token.value = payload.access_token
  }
  saveProfileToStorage(payload)
}
