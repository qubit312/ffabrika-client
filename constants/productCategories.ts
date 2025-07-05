export const categoryLabels = {
  COMMON: 'Общие',
  COSMETICS_AND_HOUSEHOLD_CHEMICALS: 'Косметика и бытовая химия',
  CLOTHES: 'Одежда',
  FOOTWEAR: 'Обувь',
  BOOKS: 'Книги',
  TEXTILE_AND_ACCESSORIES: 'Текстиль и аксессуары',
  LEATHER: 'Кожа',
  DISHES: 'Посудa',
  GLASSES: 'Стекло',
  PRODUCTS_FOR_ADULTS: 'Товары для взрослых',
  SOIL: 'Почва',
  JEWELRY: 'Ювелирные изделия',
  FOOD_AND_PET_SUPPLIES: 'Корма и товары для животных',
} as const

export type CategoryCode = keyof typeof categoryLabels

export const categoryOptions: Array<{ value: CategoryCode; label: string }> =
  (Object.entries(categoryLabels) as [CategoryCode, string][])
    .map(([value, label]) => ({ value, label }))

export function getCategoryLabel(code: string): string {
  return (categoryLabels as Record<string,string>)[code] || code
}
