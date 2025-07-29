export const categoryLabels = {
  COMMON: 'Общие',
  CLOTHES: 'Одежда',
} as const

export type CategoryCode = keyof typeof categoryLabels

export const categoryOptions: Array<{ value: CategoryCode; label: string }> =
  (Object.entries(categoryLabels) as [CategoryCode, string][])
    .map(([value, label]) => ({ value, label }))

export function getCategoryLabel(code: string): string {
  return (categoryLabels as Record<string,string>)[code] || code
}
