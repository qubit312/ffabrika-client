<script setup lang="ts">
import { getMarketplaceAccounts } from '@/services/marketplaceAccounts'
import { createStrategy, deleteStrategyItem, getStrategy, getStrategyItems, updateStrategy, updateStrategyItem, updateStrategyItemTime } from '@/services/pricingStrategies'
import type { FilterRequest } from '@/types/filter'
import type { CreateStrategyDto, PricingStrategy, StrategyAccount, StrategyItem, StrategyStatus, StrategyType } from '@/types/pricingStrategy'
import type { CustomInputContent } from '@core/types'
import { useDebounce, useDebounceFn } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name === 'repricer-edit')

const radioContent: CustomInputContent[] = [
  {
    title: 'Изменение скидок по времени',
    desc: 'Автоматическое изменение скидок по расписанию',
    value: 'time_discount',
  },
]

const productHeaders = [
  { title: 'Товар', key: 'name', sortable: true },
  { title: 'Остаток', key: 'stock', sortable: true, align: 'center' as const },
  { title: 'Скидка', key: 'discount', sortable: true, align: 'center' as const },
  { title: 'Временная скидка', key: 'temp_discount', sortable: true, align: 'center' as const },
  { title: 'Начала', key: 'starts_at', sortable: false },
  { title: 'Завершение', key: 'ends_at', sortable: false },
  { title: 'Статус', key: 'status', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]

const strategy = ref<PricingStrategy | null>(null)
const strategyName = ref('')
const strategyType = ref<StrategyType>('time_discount')
const strategyStatus = ref<StrategyStatus>('active')
const strategyAccountId = ref<number | null>(null)
const accounts = ref<StrategyAccount[]>([])

const isSetStartDialogOpen = ref(false)
const isSetEndDialogOpen = ref(false)
const globalStartTime = ref('09:00')
const globalEndTime = ref('18:00')

const snackVisible = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const sortField = ref<string>('stock')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const itemsPerPage = ref(10)
const page = ref(1)

const onOptionsUpdate = (options: any) => {
  page.value = options.page
  itemsPerPage.value = options.itemsPerPage

  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }
  fetchProducts()
}

async function fetchAccounts() {
  loading.value = true
  
  try {
    const { data, error: fetchError } = await getMarketplaceAccounts()
    
    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Ошибка загрузки данных')
    }
    
    accounts.value = (data.value || []).map((a: any) => ({
      id: a.id,
      name: a.name || `Кабинет #${a.id}`,
    })) as StrategyAccount[]
  } catch (err) {
    accounts.value = []
    console.error('Ошибка загрузки магазинов:', err)
  } finally {
    loading.value = false
  }
}

const fetchStrategy = async () => {
  const id = Number(route.params.id)
  if (!id) return

  try {
    const { data } = await getStrategy(id)
    strategy.value = data.value
    strategyName.value = data.value.name
    strategyType.value = data.value.type
    strategyStatus.value = data.value.status
    strategyAccountId.value = data.value.account_id

    sortField.value = data.value.order_by_field
    sortOrder.value = data.value.order_direction
  } catch (e) {
    console.error('Ошибка при загрузке стратегии', e)
  }
}

const applyGlobalEnd = async () => {
  const id = Number(route.params.id)
  if (!id) return

  try {
    const data = {
      field: 'ends_at',
      value: globalEndTime.value
    }

    const { data: response } = await updateStrategyItemTime(id, data)
    
    if (response.value?.updated) {     
      showSuccessNotification(`Обновлено элементов: ${response.value.updated}`)
      fetchProducts()
    }
    
    isSetEndDialogOpen.value = false
  } catch (error) {
    console.error('Error updating end time:', error)
    showErrorNotification('Ошибка при обновлении времени окончания')
  }
}

const applyGlobalStart = async () => {
  const id = Number(route.params.id)
  if (!id) return

  try {
    const data = {
      field: 'starts_at',
      value: globalStartTime.value
    }

    const { data: response } = await updateStrategyItemTime(id, data)
    
    if (response.value?.updated) {
      showSuccessNotification(`Обновлено элементов: ${response.value.updated}`)
      fetchProducts()
    }
    
    isSetStartDialogOpen.value = false
  } catch (error) {
    console.error('Error updating start time:', error)
    showErrorNotification('Ошибка при обновлении времени начала')
  }
}

const showErrorNotification = (message: string) => {
  snackVisible.value = true
  snackMessage.value = message
  snackColor.value = 'error'
}

const showSuccessNotification = (message: string) => {
  snackVisible.value = true
  snackMessage.value = message
  snackColor.value = 'success'
}


const sortFields = [
  { title: 'Остаток', value: 'stock' },
  { title: 'Скидка', value: 'discount' },
  { title: 'Временная скидка', value: 'temp_discount' },
  { title: 'Категория', value: 'category' },
  { title: 'Название', value: 'name' },
]

const updateStrategySort = useDebounceFn(async () => {
  const strategyId = Number(route.params.id)
  if (!strategyId || strategyId === 0) return

  try {
    const { data, error } = await updateStrategy(strategyId, {
      order_by_field: sortField.value,
      order_direction: sortOrder.value,
    })
    if (!data.value || error.value) {
      console.error('Ошибка при обновлении сортировки стратегии', error.value)
    }
  } catch (e) {
    console.error('Ошибка при обновлении сортировки стратегии', e)
  }
}, 800)

watch([sortField, sortOrder], () => {
  updateStrategySort()
})

const products = ref<StrategyItem[]>([])
const productsLength = ref<number>(0)

const fetchProducts = async () => {
  loading.value = true
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

    const { data } = await getStrategyItems(strategyId, requestBody)
    products.value = data.value.data
    productsLength.value = data.value.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchAccounts()
  await fetchStrategy()
  if (route.params.id !== '0') await fetchProducts()
})


const saveStrategy = async () => {
  const id = Number(route.params.id)
  const payload: CreateStrategyDto = {
    name: strategyName.value,
    type: strategyType.value,
    status: strategyStatus.value,
    account_id: strategyAccountId.value || null
  }

  try {
    if (id === 0) {
      const { data } = await createStrategy(payload)
      strategy.value = data.value
      router.push(`/repricer/details/${data.value.id}`)
    } else {
      await updateStrategy(id, payload)
    }
  } catch (e) {
    console.error('Ошибка при сохранении стратегии', e)
  }
}


const deleteItem = async () => {
  if (!itemToDelete.value) return
  try {
    await deleteStrategyItem(itemToDelete.value.id)
    products.value = products.value.filter(p => p.id !== itemToDelete.value?.id)
  } catch (e) {
    console.error('Ошибка при удалении товара', e)
  } finally {
    isDeleteDialogOpen.value = false
    itemToDelete.value = null
  }
}

const copyArticle = (article: string) => {
  navigator.clipboard.writeText(article)
}

const updateDiscount = async (item: StrategyItem) => {
  if (item.status === 'applied') return
  const discountValue = Math.round(Number(item.temp_discount) || 0)

  if (discountValue >= 100 || discountValue < 0) {
    showErrorNotification('Скидка должна быть от 1 до 99')
    return
  }

  item.temp_discount = discountValue
  try {
    await updateStrategyItem(item.id, {
      temp_discount: discountValue,
    })
  } catch (e) {
    console.error('Ошибка при обновлении скидки', e)
  }
}

const formatTime = (time?: string | null): string | null => {
  if (!time) return null
  return time.length > 5 ? time.slice(0, 5) : time
}

const updateTime = async (item: StrategyItem, field: 'starts_at' | 'ends_at') => {
  if (item.status === 'applied') return

  const startsAt = formatTime(item.starts_at) || ''
  const endsAt = formatTime(item.ends_at) || ''

  if (field === 'starts_at' && endsAt && startsAt > endsAt) {
    console.warn('Время начала позже времени окончания')
    return
  }

  try {
    await updateStrategyItem(item.id, {
      starts_at: startsAt,
      ends_at: endsAt,
    })
  } catch (e) {
    console.error('Ошибка при обновлении времени', e)
  }
}

const timeOptions = computed(() => {
  const options: { title: string; value: string }[] = []

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push({
        title: timeString,
        value: timeString,
      })
    }
  }

  return options
})

const normalizeTime = (time?: string) => time ? time.slice(0, 5) : ''

const currentStep = ref(1)
const loading = ref(false)
const isAddProductsModalOpen = ref(false)

const searchName = ref<string>('')
const debouncedQuery = useDebounce(searchName, 400)
const searchCategory = ref<string>('') 
const debouncedCategory = useDebounce(searchCategory, 400)
const searchArticle = ref<string>('')
const debouncedArticle = useDebounce(searchArticle, 400) 

const toggleStatusDialog = ref(false)
const toggleStatusItem = ref<StrategyItem | null>(null)

const confirmStatusDialog = (item: StrategyItem) => {
  if (item.status === 'applied') {
    toggleStatusDialog.value = true
    toggleStatusItem.value = item
  } else {
    toggleStatus(item)
  }
}

watch([debouncedQuery, debouncedArticle, debouncedCategory], () => {
  page.value = 1
  fetchProducts()
})

const toggleStatus = async (item: StrategyItem | null) => {
  toggleStatusDialog.value = false
  if (!item) return

  const currentStatus = item.status
  let newStatus: 'active' | 'paused' | 'applied' = 'paused'

  if (currentStatus === 'active') newStatus = 'paused'
  else if (currentStatus === 'paused') newStatus = 'active'
  else if (currentStatus === 'applied') newStatus = 'paused'

  try {
    await updateStrategyItem(item.id, { status: newStatus })
    item.status = newStatus
  } catch (e) {
    console.error('Ошибка при обновлении статуса', e)
  }
}

const getStatusVisibleName = (status: string) => {
  switch(status) {
    case 'active':
      return 'Активно'
    case 'paused':
      return 'Пауза'
    case 'applied':
      return 'В работе'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    paused: 'warning',
    applied: 'info',
  }
  return colors[status] || 'grey'
}

const itemToDelete = ref<StrategyItem | null>(null)
const isDeleteDialogOpen = ref(false)

const confirmDelete = (item: StrategyItem) => {
  itemToDelete.value = item
  isDeleteDialogOpen.value = true
}

</script>

<template>
  <VContainer>
    <VRow>
      <VCol>
        <h1 class="text-h4 mb-4">
          {{ isEdit ? 'Редактирование стратегии' : 'Создание стратегии репрайсера' }}
        </h1>
        
        <VStepper v-model="currentStep" editable>
          <VStepperHeader style="max-width: 500px;">
            <VStepperItem 
              title="Настройка" 
              :value="1"
            >
              <template #icon>
                <VIcon size="20" icon="tabler-settings" />
              </template>
            </VStepperItem>
            <VDivider></VDivider>
            <VStepperItem 
              title="Товары" 
              :value="2"
            >
              <template #icon>
                <VIcon size="20" icon="tabler-package" />
              </template>  
            </VStepperItem>
            <!-- <VDivider></VDivider>
            <VStepperItem 
              title="История" 
              :value="3"
            >
              <template #icon>
                <VIcon size="20" icon="tabler-history" />
              </template>    
            </VStepperItem> -->
          </VStepperHeader>

          <VStepperWindow>
            <VStepperWindowItem :value="1">
              <VCard>
                <h3 class="text-h6">Шаг 1: Настройка</h3>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Заполните основную информацию
                </p>
                <VRow>
                  <VCol md="4">
                    <AppTextField v-model="strategyName" label="Название стратегии" />
                  </VCol>
                  <VCol md="3">
                    <AppSelect
                      v-model="strategyStatus"
                      :items="[
                        { title: 'Активна', value: 'active' },
                        { title: 'Пауза', value: 'paused' }
                      ]"
                      label="Статус"
                    />
                  </VCol>
                </VRow>
                <VRow>
                  <VCol md="4">
                    <AppSelect
                      v-model="strategyAccountId"
                      item-title="name"
                      item-value="id"
                      clearable
                      :items="accounts"
                      label="Магазин"
                    />
                  </VCol>
                </VRow>
                <VRow>
                  <VCol>
                    <CustomRadios
                      v-model:selected-radio="strategyType"
                      :radio-content="radioContent"
                      :grid-column="{ sm: '3', cols: '12' }"
                    />
                  </VCol>
                </VRow>
                <div class="mt-4">
                  <VBtn color="primary" @click="saveStrategy">
                    {{ route.params.id === '0' ? 'Создать стратегию' : 'Сохранить изменения' }}
                  </VBtn>
                </div>
              </VCard>
            </VStepperWindowItem>

            <VStepperWindowItem :value="2">
              <VCard>
                <h3 class="text-h6">Шаг 2: Выбор товаров</h3>
                <p class="text-body-2 text-medium-emphasis">
                  Выберите товары для применения стратегии переоценки
                </p>
                
                <div class="d-flex flex-wrap gap-4 ma-6">
                  <div class="d-flex align-center">
                    <AppTextField
                      v-model="searchName"
                      placeholder="Введите название"
                      style="inline-size: 200px;"
                      class="me-3"
                      clearable
                    />
                    <AppTextField
                      v-model="searchCategory"
                      placeholder="Введите категорию"
                      style="inline-size: 200px;"
                      class="me-3"
                      clearable
                    />
                    <AppTextField
                      v-model="searchArticle"
                      placeholder="Введите артикул"
                      style="inline-size: 200px;"
                      class="me-3"
                      clearable
                    />
                  </div>

                  <VSpacer />
                  <div class="d-flex gap-4 flex-wrap align-center">
                    <div class="d-flex flex-wrap align-center me-4">
                      <div class="d-flex align-center">
                        <VSelect
                          v-model="sortField"
                          :items="sortFields"
                          label="Поле сортировки при обработке"
                          variant="outlined"
                          style="width: 220px"
                        />

                        <VBtn
                          class="ms-2 me-1 pe-2 ps-2"
                          value="asc"
                          size="small"
                          :color="sortOrder === 'asc' ? 'primary' : undefined"
                          :variant="sortOrder === 'asc' ? 'flat' : 'outlined'"
                          style="min-width: 15px"
                          @click="sortOrder='asc'"
                        >
                          <VIcon icon="tabler-arrow-up" />
                        </VBtn>
                        <VBtn
                          class="pe-2 ps-2"
                          value="desc"
                          size="small"
                          :color="sortOrder === 'desc' ? 'primary' : undefined"
                          :variant="sortOrder === 'desc' ? 'flat' : 'outlined'"
                          style="min-width: 15px"
                          @click="sortOrder='desc'"
                        >
                          <VIcon icon="tabler-arrow-down" />
                        </VBtn>
                      </div>
                    </div>
                    <VBtn
                      color="primary"
                      prepend-icon="tabler-plus"
                      @click="isAddProductsModalOpen = true"
                    >
                      Добавить товары
                    </VBtn>
                  </div>
                </div>

                <VDivider class="mt-4" />

                <VDataTable
                  :headers="productHeaders"
                  :items="products"
                  class="text-no-wrap product-table"
                  :items-per-page="itemsPerPage"
                  :page="page"
                  @update:options="onOptionsUpdate"
                >
                  <template #no-data>
                    <div class="text-center py-8">
                      <VIcon
                        icon="mdi-package-variant"
                        size="64"
                        color="grey-lighten-1"
                        class="mb-4"
                      />
                      <h3 class="text-h6 mb-2">Товары не найдены</h3>
                      <p class="text-medium-emphasis">
                        Добавьте товары для применения стратегии
                      </p>
                    </div>
                  </template>

                  <template #header.starts_at>
                    <div style="width: 120px;" class="d-flex align-center justify-space-between">
                      <span>Начало</span>
                      <VTooltip>
                        <template #activator="{ props }">
                          <VBtn
                            icon
                            size="small"
                            variant="text"
                            color="primary"
                            title="Задать всем"
                            @click.stop="isSetStartDialogOpen = true"
                            v-bind="props"
                          >
                            <VIcon icon="tabler-clock-hour-3" size="18" />
                          </VBtn>
                        </template>
                        <span>Указать время старта</span>
                      </VTooltip>            
                    </div>
                  </template>

                  <template #header.ends_at>
                    <div style="width: 120px;" class="d-flex align-center justify-space-between">
                      <span>Завершение</span>
                      <VTooltip>
                        <template #activator="{ props }">
                          <VBtn
                            icon
                            size="small"
                            variant="text"
                            color="primary"
                            title="Задать всем"
                            @click.stop="isSetEndDialogOpen = true"
                            v-bind="props"
                          >
                            <VIcon icon="tabler-clock-hour-9" size="18" />
                          </VBtn>
                        </template>
                        <span>Указать время завершения</span>
                      </VTooltip>
                    </div>
                  </template>

                  <template #loading>
                    <div class="text-center pa-6">
                      <VProgressCircular indeterminate color="primary" />
                    </div>
                  </template>

                  <template #item.name="{ item }">
                    <div class="prodcell d-flex align-start gap-3">
                      <img
                        v-if="item.product?.image"
                        :src="item.product?.image"
                        alt="Фото"
                        class="prodcell__img"
                      />
                      <div v-else class="prodcell__img prodcell__img--placeholder">
                        <VIcon icon="tabler-photo" size="22" />
                      </div>

                      <div class="d-flex flex-column">
                        <div class="d-flex align-center gap-2">
                          <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }" class="text-high-emphasis">
                            {{ item.product?.name }}
                          </RouterLink>
                        </div>

                        <div class="mt-1 text-caption text-medium-emphasis d-flex align-center flex-wrap gap-1">
                          <template v-if="item.product?.vendor_code">
                            <span class="text-truncate">{{ item.product?.vendor_code }}</span>
                            <span class="mx-1 text-disabled">•</span>
                          </template>
                          <template v-if="item.product?.article">
                            <span
                              class="cursor-pointer user-select-none d-inline-flex align-center"
                              title="Скопировать артикул"
                              @click="copyArticle(item.product?.article)"
                            >
                              {{ item.product?.article }}
                              <VIcon size="14" class="ms-1" icon="tabler-copy" />
                            </span>
                          </template>
                        </div>
                        <div class="mt-1 text-caption text-medium-emphasis d-flex align-center flex-wrap gap-1">
                          <span class="text-truncate">{{ item.product?.color }}</span>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template #item.stock="{ item }">
                    <span class="font-weight-medium">{{ item.total_qty }} шт.</span>
                  </template>

                  <template #item.status="{ item }">
                    <VChip :color="getStatusColor(item.status || '')" size="small">
                      <span class="font-weight-medium">{{ getStatusVisibleName(item.status || '') }}</span>
                    </VChip>
                  </template>

                  <template #item.discount="{ item }">
                    <span v-if="item.discount" >
                      {{ item.discount }}%
                    </span>
                    <span v-else>—</span>
                  </template>

                  <template #item.temp_discount="{ item }">
                    <div class="d-flex justify-center">
                      <VTextField
                        v-model="item.temp_discount"
                        type="number"
                        density="compact"
                        variant="outlined"
                        :append-inner-icon="item.status == 'applied' ? 'tabler-lock' : 'tabler-percentage'"
                        min="0"
                        max="100"
                        hide-spin-buttons
                        :readonly="item.status == 'applied'"
                        style="max-width: 90px;"
                        @blur="updateDiscount(item)"
                      />
                    </div>
                  </template>

                  <template #item.starts_at="{ item }">
                    <VSelect
                      v-model="item.starts_at"
                      :value="normalizeTime(item.starts_at)"
                      :items="timeOptions"
                      density="compact"
                      variant="outlined"
                      :prepend-inner-icon="item.status == 'applied' ? 'tabler-lock' : 'tabler-clock-hour-3'"
                      :readonly="item.status == 'applied'"
                      @update:model-value="updateTime(item, 'starts_at')"
                    />
                  </template>

                  <template #item.ends_at="{ item }">
                    <VSelect
                      v-model="item.ends_at"
                      :value="normalizeTime(item.ends_at)"
                      :items="timeOptions"
                      density="compact"
                      variant="outlined"
                      :prepend-inner-icon="item.status == 'applied' ? 'tabler-lock' : 'tabler-clock-hour-3'"
                      :readonly="item.status == 'applied'"
                      @update:model-value="updateTime(item, 'ends_at')"
                    />
                  </template>

                  <template #item.actions="{ item }">
                    <div class="d-flex gap-2">
                      <VTooltip>
                        <template #activator="{ props }">
                          <VBtn
                            icon
                            size="small"
                            variant="text"
                            :color="item.status === 'active' || item.status === 'applied' ? 'warning' : 'success'"
                            @click="confirmStatusDialog(item)"
                            v-bind="props"
                          >
                            <VIcon
                              :icon="item.status === 'active' || item.status === 'applied' ? 'tabler-pause' : 'tabler-play'"
                              size="small"
                            />
                          </VBtn>
                        </template>
                        <span>{{ item.status === 'active' || item.status === 'applied' ? 'Приостановить' : 'Активировать' }}</span>
                      </VTooltip>
                      <VBtn
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        @click="confirmDelete(item)"
                      >
                        <VIcon icon="tabler-trash" size="small" />
                      </VBtn>
                    </div>
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
                          :length="Math.ceil(productsLength / itemsPerPage)"
                        />
                      </div>
                    </VCardText>
                  </template>
                </VDataTable>
              </VCard>
            </VStepperWindowItem>

            <!-- <VStepperWindowItem :value="3">
              <VCard>
                <VCardText>
                  <h3 class="text-h6 mb-4">Шаг 3: История</h3>
                  <p>Контент для шага истории или другого. В РАЗРАБОТКЕ. Что здесь отобразить?</p>
                </VCardText>
              </VCard>
            </VStepperWindowItem> -->
          </VStepperWindow>

          <VStepperActions>
            <template #prev>
              <!-- Скрываем кнопку "Назад" -->
            </template>
            
            <template #next>
              <!-- <VBtn 
                color="primary" 
                :loading="loading"
                @click="handleNext"
              >
                Далее
              </VBtn> -->
            </template>
            
            <VBtn variant="outlined" @click="$router.back()">
              Отмена
            </VBtn>
          </VStepperActions>
        </VStepper>
      </VCol>
    </VRow>
  </VContainer>

  <AddProductsDialog
    v-model="isAddProductsModalOpen"
    :strategy-id="Number(route.params.id)"
    @addedProducts="fetchProducts"
  />

  <VDialog v-model="isDeleteDialogOpen" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        Удалить товар из списка?
      </VCardTitle>
      <VDivider />
      <VCardText>
        <span v-if="itemToDelete?.product?.name">
          Удалить из списка товар "{{ itemToDelete?.product?.name }}"?
        </span>
        <span v-else>
          Удалить из списка товар?
        </span>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" color="primary" @click="isDeleteDialogOpen = false">Отмена</VBtn>
        <VBtn variant="outlined" color="primary" @click="deleteItem">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Диалог: задание времени начала -->
  <VDialog v-model="isSetStartDialogOpen" max-width="360">
    <VCard>
      <VCardTitle class="text-h6">Установить начало для всех товаров</VCardTitle>
      <VDivider />
      <VCardText>
        <VSelect
          v-model="globalStartTime"
          :items="timeOptions"
          label="Время начала"
          variant="outlined"
          density="comfortable"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="isSetStartDialogOpen = false">Отмена</VBtn>
        <VBtn color="primary" @click="applyGlobalStart">Применить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Диалог: задание времени окончания -->
  <VDialog v-model="isSetEndDialogOpen" max-width="360">
    <VCard>
      <VCardTitle class="text-h6">Установить окончание для всех товаров</VCardTitle>
      <VDivider />
      <VCardText>
        <VSelect
          v-model="globalEndTime"
          :items="timeOptions"
          label="Время окончания"
          variant="outlined"
          density="comfortable"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="isSetEndDialogOpen = false">Отмена</VBtn>
        <VBtn color="primary" @click="applyGlobalEnd">Применить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="toggleStatusDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">Смена статуса</VCardTitle>
      <VDivider />
      <VCardText>
        <span>
          Вы уверены, что хотите изменить статус? После изменения статуса скидка не измениться.
        </span>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" @click="toggleStatusDialog = false">Отмена</VBtn>
        <VBtn variant="outlined" @click="toggleStatus(toggleStatusItem)">Продолжить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snackVisible" :timeout="3000" :color="snackColor" location="top right">
    {{ snackMessage }}
  </VSnackbar>
</template>

<style scoped>
.product-icon {
  inline-size: 22px;
  block-size: 22px;
  display: inline-block;
  vertical-align: middle;
  cursor: default;
}

.prodcell__img {
  inline-size: 55px;
  block-size: 75px;
  object-fit: cover;
  border-radius: 8px;
}

.prodcell__img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.55);
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
}
</style>
