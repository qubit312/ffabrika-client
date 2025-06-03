export type MarkingParams = {
  id: number
  name: string
  article: string
  composition: string
  client: ShortEntityParams
  category: string
  color: string
  size: string
  barcode: string
  needsChestnyZnakLabel: boolean
}

export type ShortEntityParams = {
    id: number
    name: string
}
