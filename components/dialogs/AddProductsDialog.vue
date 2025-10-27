<script setup lang="ts">
import { addStrategyItems, getAvailableStrategyItems } from '@/services/pricingStrategies';
import type { FilterRequest } from '@/types/filter';
import type { AddStrategyItemDto, StrategyItemProduct } from '@/types/pricingStrategy';
import { useDebounce } from '@vueuse/core';
import { defineEmits, defineProps, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute()

const props = defineProps<{ modelValue: boolean; strategyId: number }>()
const emit = defineEmits<{
  (e: 'addedProducts'): void
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = ref(props.modelValue)
const availableProducts = ref<StrategyItemProduct[]>([])
const loadingAvailable = ref(false)

const itemsPerPage = ref(10)
const page = ref(1)
const selectedProducts = ref([])

const searchName = ref<string>('')
const debouncedQuery = useDebounce(searchName, 400)
const searchCategory = ref<string>('') 
const debouncedCategory = useDebounce(searchCategory, 400)
const searchArticle = ref<string>('')
const debouncedArticle = useDebounce(searchArticle, 400) 

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)

const onOptionsUpdate = (options: any) => {
  page.value = options.page
  itemsPerPage.value = options.itemsPerPage

  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }
  fetchAvailableProducts()
}

const selectionHeaders = [
  { title: 'Товар', key: 'name', sortable: true },
  { title: 'Категория', key: 'category_name', sortable: true },
  { title: 'Остаток', key: 'stock', sortable: true, align: 'center' as const },
  { title: 'Текущая скидка', key: 'discount', sortable: true, align: 'center' as const },
]

watch(() => props.modelValue, val => (isOpen.value = val))

watch(isOpen, val => {
    if (val) fetchAvailableProducts()
    emit('update:modelValue', val)
})

const fetchAvailableProducts = async () => {
  loadingAvailable.value = true
  try {
    const strategyId = Number(route.params.id)

    const requestBody: FilterRequest = {
      page: page.value,
      per_page: itemsPerPage.value,
      sort_by: sortBy.value?.key || 'name',
      sort_dir: sortBy.value?.order || 'asc',
      filters: [
        ...(searchName.value ? [{ field: 'name', op: 'like' as const, value: searchName.value }] : []),
        ...(searchArticle.value ? [{ field: 'article', op: 'like' as const, value: searchArticle.value }] : []),
        ...(searchCategory.value ? [{ field: 'category', op: 'like' as const, value: searchCategory.value }] : []),
      ],
    }

    const { data } = await getAvailableStrategyItems(strategyId, requestBody)
    availableProducts.value = data.value.data || []
  } finally {
    loadingAvailable.value = false
  }
}

const addSelectedProducts = async () => {
  if (selectedProducts.value.length === 0) return

  const strategyId = Number(route.params.id)
  const items: AddStrategyItemDto[] = selectedProducts.value.map(id => ({
    model_id: id,
  }))

  await addStrategyItems(strategyId, items)
  emit('addedProducts')
  isOpen.value = false
  selectedProducts.value = []
}

const copyArticle = (article: string) => {
  navigator.clipboard.writeText(article)
}

watch([debouncedQuery, debouncedArticle, debouncedCategory], () => {
  page.value = 1
  fetchAvailableProducts()
})

const resetFilters = () => {
  searchName.value = ''
  searchCategory.value = ''
  searchArticle.value = ''
}
</script>

<template>
  <VDialog
    v-model="isOpen"
    max-width="1200"
    scrollable
  >
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        <span>Выбор товаров</span>
        <VBtn
          icon
          variant="text"
          @click="isOpen = false"
        >
          <VIcon icon="tabler-x" />
        </VBtn>
      </VCardTitle>

      <VCardText>
        <!-- Фильтры -->
        <VRow class="mb-4">
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model="searchName"
              placeholder="Поиск по названию..."
              prepend-inner-icon="tabler-search"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model="searchCategory"
              placeholder="Категория"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model="searchArticle"
              placeholder="Артикул"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="2">
            <VBtn
              variant="tonal"
              block
              @click="resetFilters"
            >
              Сбросить
            </VBtn>
          </VCol>
        </VRow>

        <VDataTable
          :headers="selectionHeaders"
          :items="availableProducts"
          v-model="selectedProducts"
          show-select
          class="text-no-wrap product-table"
          :items-per-page="itemsPerPage"
          :page="page"
          @update:options="onOptionsUpdate"
        >
          <template #item.name="{ item }">
            <div class="prodcell d-flex align-start gap-3">
              <img
                v-if="item.image"
                :src="item.image"
                alt="Фото"
                class="prodcell__img"
              />
              <div v-else class="prodcell__img prodcell__img--placeholder">
                <VIcon icon="tabler-photo" size="22" />
              </div>

              <div class="d-flex flex-column">
                <div class="d-flex align-center gap-2">
                  <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }" class="text-high-emphasis">
                    {{ item.name }}
                  </RouterLink>
                </div>

                <div class="mt-1 text-caption text-medium-emphasis d-flex align-center flex-wrap gap-1">
                  <template v-if="item.category_name">
                    <span class="text-truncate">{{ item.vendor_code }}</span>
                    <span class="mx-1 text-disabled">•</span>
                  </template>
                  <template v-if="item.article">
                    <span
                      class="cursor-pointer user-select-none d-inline-flex align-center"
                      title="Скопировать артикул"
                      @click="copyArticle(item.article)"
                    >
                      {{ item.article }}
                      <VIcon size="14" class="ms-1" icon="tabler-copy" />
                    </span>
                  </template>
                </div>
                <div class="mt-1 text-caption text-medium-emphasis d-flex align-center flex-wrap gap-1">
                  <span class="text-truncate">{{ item.color }}</span>
                </div>
              </div>
            </div>
          </template>

          <template #item.stock="{ item }">
            <span :class="{'text-error': item.stock === 0}">
              {{ item.stock }} шт.
            </span>
          </template>

          <template #item.discount="{ item }">
            <span
              v-if="item.discount"
              size="small"
              color="orange"
              variant="flat"
            >
              {{ item.discount }}%
            </span>
            <span v-else>—</span>
          </template>
          <template #bottom>
            <VCardText class="pt-2">
              <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
                <div class="d-flex align-center gap-2">
                  <span>Записей на странице</span>
                  <VSelect
                    v-model="itemsPerPage"
                    :items="[5, 10, 25, 50]"
                    style="max-inline-size: 8rem;min-inline-size: 5rem;"
                  />
                </div>

                <VPagination
                  v-model="page"
                  :total-visible="5"
                  :length="Math.ceil(availableProducts.length / itemsPerPage)"
                />
              </div>
            </VCardText>
          </template>
        </VDataTable>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="isOpen = false"
        >
          Отмена
        </VBtn>
        <VBtn
          color="primary"
          :disabled="selectedProducts.length === 0"
          @click="addSelectedProducts"
        >
          Добавить выбранные ({{ selectedProducts.length }})
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
