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

  { title: 'Действия', key: 'actions', sortable: false },
]

const strategy = ref<PricingStrategy | null>(null)
const strategyName = ref('')
const strategyType = ref<StrategyType>('time_discount')
const strategyStatus = ref<StrategyStatus>('active')
const strategyAccountId = ref<number | null>(null)
const accounts = ref<StrategyAccount[]>([])

const _oldDiscount = ref<number | null>(null)
const _oldStartsAt = ref<string | null>(null)
const _oldEndsAt = ref<string | null>(null)
const _oldStatus = ref<'active' | 'paused' | 'applied' | null>(null)

const isSetStartDialogOpen = ref(false)
const isSetEndDialogOpen = ref(false)
const globalStartTime = ref('09:00')
const globalEndTime = ref('18:00')

const strategyLoading = ref<boolean>(false)

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
    loading.value = false
  } finally {
    loading.value = false
  }
}

const fetchStrategy = async () => {
  strategyLoading.value = true 
  const id = Number(route.params.id)
  if (!id) {
    strategyLoading.value = false
    return
  }

  try {
    const { data, error } = await getStrategy(id)
    const fetchResult = handleUpdateResponse(
      data, error, undefined, undefined,
      'Не удалось получить информацию по стратегии'
    )
    const strategy = data.value.data

    if (fetchResult && strategy) {
      strategy.value = strategy
      strategyName.value = strategy.name
      strategyType.value = strategy.type
      strategyStatus.value = strategy.status
      strategyAccountId.value = strategy.account_id

      sortField.value = strategy.order_by_field
      sortOrder.value = strategy.order_direction
    }
  } catch (e) {
    console.error('Ошибка при загрузке стратегии', e)
    strategyLoading.value = false
  } finally {
    strategyLoading.value = false
  }
}

const applyGlobalEnd = async () => {
  const id = Number(route.params.id)
  if (!id) return

  try {
    const payload = {
      field: 'ends_at',
      value: globalEndTime.value
    }

    const { data, error } = await updateStrategyItemTime(id, payload)
    
    handleUpdateResponse(
      data, error,
      () => {
        const count = data.value.data?.updated
        if (count) showSuccessNotification(`Обновлено элементов: ${count}`)
        fetchProducts()
      },
      undefined,
      'Не удалось обновить время для товаров'
    )
    
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
    const payload = {
      field: 'starts_at',
      value: globalStartTime.value
    }

    const { data, error } = await updateStrategyItemTime(id, payload)
    
    handleUpdateResponse(
      data, error,
      () => {
        const count = data.value.data?.updated
        if (count) showSuccessNotification(`Обновлено элементов: ${count}`)
        fetchProducts()
      },
      undefined,
      'Не удалось обновить время для товаров'
    )
    
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

    handleUpdateResponse(
      data, error, undefined, undefined,
      'Не удалось обновить сортировку стратегии'
    )
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

    const { data, error } = await getStrategyItems(strategyId, requestBody)
    handleUpdateResponse(
      data, error, 
      () => {
        products.value = data.value.data
        productsLength.value = data.value.total
      },
      () => {
        products.value = []
        productsLength.value = 0
      },
      'Не удалось обновить сортировку стратегии'
    )
    
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
  strategyLoading.value = true
  const id = Number(route.params.id)
  const payload: CreateStrategyDto = {
    name: strategyName.value,
    type: strategyType.value,
    status: strategyStatus.value,
    account_id: strategyAccountId.value || null
  }

  try {
    if (id === 0) {
      const { data, error } = await createStrategy(payload)

      handleUpdateResponse(
        data, error,
        () => {
          const createdStrategy = data.value?.data
          if (createdStrategy) strategy.value = createdStrategy
          if (createdStrategy?.id) router.push(`/repricer/details/${createdStrategy.id}`)
        },
        undefined,
        'Не удалось обновить стратегию'
      )
    } else {
      const { data, error } = await updateStrategy(id, payload)

      handleUpdateResponse(
        data, error,
        undefined,
        undefined,
        'Не удалось обновить стратегию'
      )
    }
  } catch (e) {
    console.error('Ошибка при сохранении стратегии', e)
    strategyLoading.value = false
  } finally {
    strategyLoading.value = false
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

const formatTime = (time?: string | null): string | null => {
  if (!time) return null
  return time.length > 5 ? time.slice(0, 5) : time
}

const updateDiscount = async (item: StrategyItem) => {
  if (item.status === 'applied') {
    if(_oldDiscount.value) item.temp_discount = _oldDiscount.value
    return
  }
  const discountValue = Math.round(Number(item.temp_discount) || 0)

  if (discountValue >= 100 || discountValue < 0) {
    showErrorNotification('Скидка должна быть от 1 до 99')
    if(_oldDiscount.value) item.temp_discount = _oldDiscount.value
    return
  }

  item.temp_discount = discountValue
  try {
    const { data, error } = await updateStrategyItem(item.id, {
      temp_discount: discountValue,
    })

    handleUpdateResponse(
      data, error, undefined,
      () => { if(_oldDiscount.value) item.temp_discount = _oldDiscount.value },
      'Не удалось обновить скидку'
    )
  } catch (e: any) {
    console.error('Ошибка при обновлении скидки', e)
    showErrorNotification('Ошибка при обновлении скидки')
    if(_oldDiscount.value) {
      item.temp_discount = _oldDiscount.value
    }
  }
}

const updateTime = async (item: StrategyItem, field: 'starts_at' | 'ends_at') => {
  if (item.status === 'applied') {
    showErrorNotification('Недоступно редактирование')
    rollbackTimeValue(item, field)
    return
  }

  const startsAt = formatTime(item.starts_at) || ''
  const endsAt = formatTime(item.ends_at) || ''

  if (field === 'starts_at' && endsAt && startsAt > endsAt) {
    showErrorNotification('Время начала позже времени окончания')
    rollbackTimeValue(item, field)
    return
  }

  let payload: Record<string, any> | null = null
  if (field === 'starts_at') payload = { starts_at: startsAt }
  if (field === 'ends_at') payload = { ends_at: endsAt }

  try {
    if (!payload) {
      rollbackTimeValue(item, field)
      showErrorNotification('Данные в запросе пустые')
      return
    }

    const { data, error } = await updateStrategyItem(item.id, payload)

    handleUpdateResponse(
      data, error, undefined,
      () => rollbackTimeValue(item, field),
      'Не удалось обновить время'
    )
  } catch (e: any) {
    console.error('Ошибка при обновлении времени', e)
    showErrorNotification('Ошибка при обновлении времени')
    rollbackTimeValue(item, field)
  }
}

const toggleStatus = async (item: StrategyItem | null) => {
  toggleStatusDialog.value = false
  if (!item) return

  const currentStatus = item.status
  let newStatus: 'active' | 'paused' | 'applied' = 'paused'

  if (currentStatus === 'active') newStatus = 'paused'
  else if (currentStatus === 'paused') newStatus = 'active'
  else if (currentStatus === 'applied') newStatus = 'paused'

  try {
    const { data, error } = await updateStrategyItem(item.id, { status: newStatus })
    handleUpdateResponse(
      data, error,
      () => { item.status = newStatus },
      () => { if(_oldStatus.value) item.status = _oldStatus.value },
      'Не удалось обновить статус'
    )
  } catch (e) {
    console.error('Ошибка при обновлении статуса', e)
    showErrorNotification('Не удалось обновить статус')
    if(_oldStatus.value) item.status = _oldStatus.value
  }
}

const handleUpdateResponse = (
  data: any,
  error: any,
  successCallback?: () => void,
  errorCallback?: () => void,
  defaultErrorMessage: string = 'Не удалось выполнить обновление'
): boolean => {
  if (!data.value?.success || error.value) {
    const errorMessage = error.value?.data?.message || data.value?.message
    showErrorNotification(errorMessage || defaultErrorMessage)
    errorCallback?.()
    return false
  }

  successCallback?.()
  return true
}

const rollbackTimeValue = (item: StrategyItem, field: 'starts_at' | 'ends_at') => {
  if (field === 'starts_at' && _oldStartsAt.value) {
    item.starts_at = _oldStartsAt.value
  }
  if (field === 'ends_at' && _oldEndsAt.value) {
    item.ends_at = _oldEndsAt.value
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
                  <VCol md="4">
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
                
                  <VCol md="4" class="d-flex ">
                    <AppSelect
                      v-model="sortField"
                      :items="sortFields"
                      label="Поле сортировки"
                      variant="outlined"
                      class="me-2"
                    />
                  
                    <div class="d-flex align-center mart">
                      <VBtn
                        value="asc"
                        size="small"
                        :color="sortOrder === 'asc' ? 'primary' : undefined"
                        :variant="sortOrder === 'asc' ? 'flat' : 'outlined'"
                        class="me-1 pe-2 ps-2"
                        style="min-width: 15px"
                        @click="sortOrder = 'asc'"
                      >
                        <VIcon icon="tabler-arrow-up" />
                      </VBtn>
                    
                      <VBtn
                        value="desc"
                        size="small"
                        :color="sortOrder === 'desc' ? 'primary' : undefined"
                        :variant="sortOrder === 'desc' ? 'flat' : 'outlined'"
                        class="pe-2 ps-2"
                        style="min-width: 15px"
                        @click="sortOrder = 'desc'"
                      >
                        <VIcon icon="tabler-arrow-down" />
                      </VBtn>
                    </div>
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
                
                <div class="d-flex flex-wrap gap-4 mt-6 mb-6">
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
                          <span class="mx-1 text-disabled">•</span>
                          <VChip :color="getStatusColor(item.status || '')" size="small">
                            {{ getStatusVisibleName(item.status || '') }}
                          </VChip>
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
                        @focus="_oldDiscount = item.temp_discount"
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
                      @focus="_oldStartsAt = item.starts_at"
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
                      @focus="_oldEndsAt = item.ends_at"
                      @update:model-value="updateTime(item, 'ends_at')"
                    />
                  </template>

                  <template #item.actions="{ item }">
                    <div class="action-menu-wrapper">
                      <VMenu open-on-hover>
                        <template #activator="{ props }">
                          <VBtn
                            v-bind="props"
                            icon
                            variant="text"
                            class="action-menu-trigger"
                          >
                            <VIcon icon="tabler-dots-vertical" />
                          </VBtn>
                        </template>
                      
                        <VList density="compact">
                          <!-- Активировать / Пауза -->
                          <VListItem @click="confirmStatusDialog(item)">
                            <VListItemTitle
                              class="d-flex align-center"
                              :class="{
                                'text-success': item.status === 'paused',
                                'text-warning': item.status === 'active' || item.status === 'applied',
                              }"
                            >
                              <VIcon
                                class="me-2"
                                :color="item.status === 'paused' ? 'success'
                                        : (item.status === 'active' || item.status === 'applied') ? 'warning' : ''"
                                :icon="item.status === 'active' || item.status === 'applied'
                                        ? 'tabler-pause'
                                        : 'tabler-play'"
                              />
                              {{ item.status === 'active' || item.status === 'applied'
                                ? 'Приостановить'
                                : 'Активировать' }}
                            </VListItemTitle>
                          </VListItem>
                        
                          <!-- Удалить -->
                          <VListItem @click="confirmDelete(item)">
                            <VListItemTitle class="d-flex align-center text-error">
                              <VIcon class="me-2" color="error" icon="tabler-trash" />
                              Удалить
                            </VListItemTitle>
                          </VListItem>
                        </VList>
                      </VMenu>
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

  <CustomLoading :loading="strategyLoading"/>
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
.mart {
  margin-top: 15px;
}
</style>
