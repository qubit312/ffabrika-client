export interface Printer {
  id: number
  name: string
  labels_count: number
  capacity: number
  warning_threshold: number
  last_synced_at: string | null
  created_at: string
  updated_at: string
  created_by: number | null
  updated_by: number | null
}

export interface CreatePrinterDto {
  name: string
  capacity: number
  labels_count?: number
  warning_threshold?: number
}
