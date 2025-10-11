import { useApi } from '../composables/useApi'

export interface FileOperation {
  id: number
  operation_type: string
  file_name: string
  file_extension: string
  file_size: number
  user_id: number
  client_id: number
  status: 'success' | 'failed' | 'in_progress' | string
  error_message: string | null
  related_to: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  current_page: number
  data: T[]
  per_page: number
  total: number
  last_page: number
  next_page_url?: string | null
  prev_page_url?: string | null
}

export interface GetFileOperationsParams {
  page?: number
  per_page?: number
}

export function getFileOperations(params: GetFileOperationsParams = {}) {
  return useApi<PaginatedResponse<FileOperation>>('/api/file-operations', {
    method: 'GET',
    params,
  })
}
