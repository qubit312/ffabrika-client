
<script setup lang="ts">
import type { CustomInputContent } from '@core/types'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isEdit = computed(() => route.name === 'repricer-edit')

const radioContent: CustomInputContent[] = [
  {
    title: 'Изменение скидок по времени',
    desc: 'Автоматическое изменение скидок в заданное время суток или по расписанию',
    value: 'basic',
  },
]

const selectedRadio = ref('basic')
const productHeaders = [
  { title: 'Товар', key: 'name', sortable: true },
  { title: 'Остаток', key: 'stock', sortable: true, align: 'center' as const },
  { title: 'Текущая скидка', key: 'current_discount', sortable: true, align: 'center' as const },
  { title: 'Временная скидка', key: 'temp_discount', sortable: true, align: 'center' as const },
  { title: 'Дата начала', key: 'start_time', sortable: false },
  { title: 'Дата завершения', key: 'end_time', sortable: false },
  { title: 'Статус', key: 'status', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]

// Глобальное задание времени для всех товаров
// Диалоги для массового задания начала и конца
const isSetStartDialogOpen = ref(false)
const isSetEndDialogOpen = ref(false)
const globalStartTime = ref('09:00')
const globalEndTime = ref('18:00')

// Применение только начала
const applyGlobalStart = () => {
  products.value.forEach(item => {
    item.start_time = globalStartTime.value
  })
  isSetStartDialogOpen.value = false
}

// Применение только конца
const applyGlobalEnd = () => {
  products.value.forEach(item => {
    item.end_time = globalEndTime.value
  })
  isSetEndDialogOpen.value = false
}

// 🔹 Параметры сортировки (используются в обработке)
const sortField = ref<string>('stock')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 🔹 Доступные поля сортировки
const sortFields = [
  { title: 'Остаток', value: 'stock' },
  { title: 'Текущая скидка', value: 'current_discount' },
  { title: 'Временная скидка', value: 'temp_discount' },
  { title: 'Категория', value: 'category' },
  { title: 'Название', value: 'name' },
]

// 🔹 Для отладки/будущей интеграции
watch([sortField, sortOrder], () => {
  console.log('Выбрана сортировка:', {
    field: sortField.value,
    order: sortOrder.value,
  })
})

const allProducts = [
  {
    id: 1,
    name: 'Футболка хлопковая',
    article: 'T001',
    category: 'Одежда',
    color: 'Белый',
    main_image_url: '',
    stock: 45,
    current_discount: 10,
    temp_discount: 15,
    start_time: '09:00',
    end_time: '18:00',
    status: 'active'
  },
  {
    id: 2,
    name: 'Джинсы классические',
    article: 'J002',
    category: 'Одежда',
    color: 'Синий',
    main_image_url: '',
    stock: 23,
    current_discount: 5,
    temp_discount: 20,
    start_time: '10:00',
    end_time: '22:00',
    status: 'active'
  },
  {
    id: 3,
    name: 'Кроссовки спортивные',
    article: 'S003',
    category: 'Обувь',
    color: 'Черный',
    main_image_url: '',
    stock: 12,
    current_discount: 44,
    temp_discount: 25,
    start_time: '08:30',
    end_time: '20:30',
    status: 'active'
  },
  {
    id: 4,
    name: 'Куртка зимняя',
    article: 'J004',
    category: 'Одежда',
    color: 'Красный',
    main_image_url: '',
    stock: 8,
    current_discount: 15,
    temp_discount: 30,
    start_time: '12:00',
    end_time: '15:00',
    status: 'active'
  },
  {
    id: 5,
    name: 'Рубашка офисная',
    article: 'S005',
    category: 'Одежда',
    color: 'Бежевый',
    main_image_url: '',
    stock: 34,
    current_discount: 55,
    temp_discount: 10,
    start_time: '14:00',
    end_time: '16:00',
    status: 'active'
  },
  {
    id: 11,
    name: 'Рубашка с коротким рукавом',
    article: 'S077',
    category: 'Одежда',
    color: 'Бежевый',
    main_image_url: '',
    stock: 34,
    current_discount: 66,
    temp_discount: 10,
    start_time: '14:00',
    end_time: '16:00',
    status: 'active'
  },
  {
    id: 6,
    name: 'Брюки классические',
    article: 'P006',
    category: 'Одежда',
    color: 'Белый',
    main_image_url: '',
    stock: 15,
    current_discount: 12,
  },
  {
    id: 7,
    name: 'Футболка поло',
    article: 'T007',
    category: 'Одежда',
    color: 'Белый',
    main_image_url: '',
    stock: 28,
    current_discount: 10,
  },
  {
    id: 8,
    name: 'Кроссовки беговые',
    article: 'S008',
    category: 'Обувь',
    color: 'Белый',
    main_image_url: '',
    stock: 7,
    current_discount: 5,
  },
  {
    id: 9,
    name: 'Толстовка с капюшоном',
    article: 'H009',
    category: 'Одежда',
    color: 'Белый',
    main_image_url: '',
    stock: 20,
    current_discount: 10,
  },
  {
    id: 10,
    name: 'Шорты спортивные',
    article: 'S010',
    category: 'Одежда',
    color: 'Белый',
    main_image_url: '',
    stock: 32,
    current_discount: 15,
  },
  {
    id: 12,
    name: 'Шорты спортивные синие',
    article: 'S011',
    category: 'Одежда',
    color: 'Синий',
    main_image_url: '',
    stock: 32,
    current_discount: 15,
  },
]

const products = ref(allProducts.slice(0, 6))

const availableProducts = computed(() => {
  const usedIds = products.value.map(p => p.id)
  return allProducts.filter(p => !usedIds.includes(p.id))
})

const addSelectedProducts = () => {
  const productsToAdd = availableProducts.value.filter(p => 
    selectedProducts.value.includes(p.id)
  ).map(p => ({
    ...p,
    temp_discount: 0,
    start_time: '09:00',
    end_time: '18:00',
    status: 'active'
  }))
  
  products.value.push(...productsToAdd)
  selectedProducts.value = []
  isAddProductsModalOpen.value = false
}

// Метод удаления товара
const deleteItem = () => {
  if (itemToDelete.value) {
    const index = products.value.findIndex(p => p.id === itemToDelete.value.id)
    if (index !== -1) {
      products.value.splice(index, 1)
    }
  }
  isDeleteDialogOpen.value = false
  itemToDelete.value = null
}

const itemsPerPage = ref(5)
const page = ref(1)
const availableProductsPerPage = ref(5)
const availableProductsPage = ref(1)

// Вспомогательные функции
const copyArticle = (article: string) => {
  navigator.clipboard.writeText(article)
  // Можно добавить уведомление об успешном копировании
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU')
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(price)
}

const updateDiscount = (item: any) => {
  console.log(`Обновлена скидка для товара ${item.name}: ${item.temp_discount}%`)
}

const updateTime = (item: any, field: string) => {
  console.log(`Обновлено время ${field} для товара ${item.name}: ${item[field]}`)
  // Проверка корректности времени
  if (field === 'start_time' && item.end_time) {
    if (item.start_time > item.end_time) {
      console.warn('Время начала позже времени окончания')
    }
  }
}

const timeOptions = computed(() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const totalMinutes = hour * 60 + minute
      options.push({
        title: timeString,
        value: totalMinutes
      })
    }
  }
  return options
})

const currentStep = ref(1)
const loading = ref(false)
const handleNext = () => {
  if (currentStep.value === 1) {
    loading.value = true
    currentStep.value++
    loading.value = false
  } else {
    currentStep.value++
  }
}

const isAddProductsModalOpen = ref(false)

// Фильтры
const searchQuery = ref('')
const categoryFilter = ref('')
const articleFilter = ref('')

// Выбранные товары
const selectedProducts = ref([])

// Заголовки таблицы выбора
const selectionHeaders = [
  { title: 'Товар', key: 'name', sortable: true },
  { title: 'Категория', key: 'category', sortable: true },
  { title: 'Остаток', key: 'stock', sortable: true, align: 'center' as const },
  { title: 'Текущая скидка', key: 'current_discount', sortable: true, align: 'center' as const },
]

// Опции фильтров
const categories = computed(() => {
  return [...new Set(availableProducts.value.map(p => p.category))].map(c => ({ title: c, value: c }))
})

const colors = computed(() => {
  return [...new Set(availableProducts.value.map(p => p.color))].map(c => ({ title: c, value: c }))
})

watch(() => selectedProducts.value, (val) => {
  console.log(val)
})


const resetFilters = () => {
  searchQuery.value = ''
  categoryFilter.value = ''
  articleFilter.value = ''
}

const toggleStrategy = (strategy: any) => {
  strategy.status = strategy.status === 'active' ? 'paused' : 'active'
}

const getStatusVisibleName = (status: string) => {
  switch(status) {
    case 'active':
      return 'Активно'
    case 'paused':
      return 'Пауза'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    paused: 'warning',
    draft: 'grey',
  }
  return colors[status] || 'grey'
}

const itemToDelete = ref(null)
const isDeleteDialogOpen = ref(false)

const confirmDelete = (item) => {
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
          <VStepperHeader style="max-width: 800px;">
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
            <VDivider></VDivider>
            <VStepperItem 
              title="История" 
              :value="3"
            >
              <template #icon>
                <VIcon size="20" icon="tabler-history" />
              </template>    
            </VStepperItem>
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
                    <AppTextField label="Название стратегии" />
                  </VCol>
                </VRow>
                <VRow>
                  <VCol>
                    <CustomRadios
                      v-model:selected-radio="selectedRadio"
                      :radio-content="radioContent"
                      :grid-column="{ sm: '3', cols: '12' }"
                    />
                  </VCol>
                </VRow>
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
                      placeholder="Введите название"
                      style="inline-size: 200px;"
                      class="me-3"
                      clearable
                    />
                    <AppTextField
                      placeholder="Введите категорию"
                      style="inline-size: 200px;"
                      class="me-3"
                      clearable
                    />
                    <AppTextField
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

                  <!-- Кнопка в заголовке "Дата начала" -->
                  <template #header.start_time>
                    <div class="d-flex align-center justify-space-between">
                      <span>Дата начала</span>
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

                  <!-- Кнопка в заголовке "Дата завершения" -->
                  <template #header.end_time>
                    <div class="d-flex align-center justify-space-between">
                      <span>Дата завершения</span>
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
                        v-if="item.main_image_url"
                        :src="item.main_image_url"
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
                          <template v-if="item.category">
                            <span class="text-truncate">{{ item.category }}</span>
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
                          <template v-if="item.category">
                            <span class="text-truncate">{{ item.color }}</span>
                          </template>
                        </div>
                      </div>
                    </div>
                  </template>

                  <template #item.stock="{ item }">
                    <span class="font-weight-medium">{{ item.stock }} шт.</span>
                  </template>

                  <template #item.status="{ item }">
                    <VChip :color="getStatusColor(item.status || '')" size="small">
                      <span class="font-weight-medium">{{ getStatusVisibleName(item.status || '') }}</span>
                    </VChip>
                  </template>

                  <template #item.current_discount="{ item }">
                    <span v-if="item.current_discount" >
                      {{ item.current_discount }}%
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
                        suffix="%"
                        min="0"
                        max="100"
                        hide-spin-buttons
                        style="max-width: 80px;"
                        @update:model-value="updateDiscount(item)"
                      />
                    </div>
                  </template>

                  <template #item.start_time="{ item }">
                    <VSelect
                      v-model="item.start_time"
                      :items="timeOptions"
                      density="compact"
                      variant="outlined"
                      prepend-inner-icon="tabler-clock-hour-3"
                      @update:model-value="updateTime(item, 'start_time')"
                    />
                  </template>

                  <template #item.end_time="{ item }">
                    <VSelect
                      v-model="item.end_time"
                      :items="timeOptions"
                      density="compact"
                      variant="outlined"
                      prepend-inner-icon="tabler-clock-hour-3"
                      placeholder="Выберите время"
                      @update:model-value="updateTime(item, 'end_time')"
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
                            :color="item.status === 'active' ? 'warning' : 'success'"
                            @click="toggleStrategy(item)"
                            v-bind="props"
                          >
                            <VIcon
                              :icon="item.status === 'active' ? 'tabler-pause' : 'tabler-play'"
                              size="small"
                            />
                          </VBtn>
                        </template>
                        <span>{{ item.status === 'active' ? 'Приостановить' : 'Активировать' }}</span>
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
                          :length="Math.ceil(products.length / itemsPerPage)"
                        />
                      </div>
                    </VCardText>
                  </template>
                </VDataTable>
              </VCard>
            </VStepperWindowItem>

            <VStepperWindowItem :value="3">
              <VCard>
                <VCardText>
                  <h3 class="text-h6 mb-4">Шаг 3: История</h3>
                  <p>Контент для шага истории или другого. В РАЗРАБОТКЕ. Что здесь отобразить?</p>
                </VCardText>
              </VCard>
            </VStepperWindowItem>
          </VStepperWindow>

          <VStepperActions>
            <template #prev>
              <!-- Скрываем кнопку "Назад" -->
            </template>
            
            <template #next>
              <VBtn 
                color="primary" 
                :loading="loading"
                @click="handleNext"
              >
                Далее
              </VBtn>
            </template>
            
            <VBtn variant="outlined" @click="$router.back()">
              Отмена
            </VBtn>
          </VStepperActions>
        </VStepper>
      </VCol>
    </VRow>
  </VContainer>

  <VDialog
    v-model="isAddProductsModalOpen"
    max-width="1200"
    scrollable
  >
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        <span>Выбор товаров</span>
        <VBtn
          icon
          variant="text"
          @click="isAddProductsModalOpen = false"
        >
          <VIcon icon="tabler-x" />
        </VBtn>
      </VCardTitle>

      <VCardText>
        <!-- Фильтры -->
        <VRow class="mb-4">
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model="searchQuery"
              placeholder="Поиск по названию..."
              prepend-inner-icon="tabler-search"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model="categoryFilter"
              :items="categories"
              placeholder="Категория"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model="articleFilter"
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

        <!-- Таблица товаров для выбора -->
        <VDataTable
          :headers="selectionHeaders"
          :items="availableProducts"
          v-model="selectedProducts"
          :search="searchQuery"
          show-select
          class="text-no-wrap product-table"
          :items-per-page="availableProductsPerPage"
          :page="availableProductsPage"
        >
          <template #item.name="{ item }">
            <div class="prodcell d-flex align-start gap-3">
              <img
                v-if="item.main_image_url"
                :src="item.main_image_url"
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
                  <template v-if="item.category">
                    <span class="text-truncate">{{ item.category }}</span>
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
                  <template v-if="item.category">
                    <span class="text-truncate">{{ item.color }}</span>
                  </template>
                </div>
              </div>
            </div>
          </template>

          <template #item.stock="{ item }">
            <span :class="{'text-error': item.stock === 0}">
              {{ item.stock }} шт.
            </span>
          </template>

          <template #item.current_discount="{ item }">
            <span
              v-if="item.current_discount"
              size="small"
              color="orange"
              variant="flat"
            >
              {{ item.current_discount }}%
            </span>
            <span v-else>—</span>
          </template>
          <template #bottom>
            <VCardText class="pt-2">
              <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
                <div class="d-flex align-center gap-2">
                  <span>Записей на странице</span>
                  <VSelect
                    v-model="availableProductsPerPage"
                    :items="[5, 10, 25, 50]"
                    style="max-inline-size: 8rem;min-inline-size: 5rem;"
                  />
                </div>

                <VPagination
                  v-model="availableProductsPage"
                  :total-visible="5"
                  :length="Math.ceil(availableProducts.length / availableProductsPerPage)"
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
          @click="isAddProductsModalOpen = false"
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

  <VDialog v-model="isDeleteDialogOpen" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        Удалить товар из списка?
      </VCardTitle>
      <VDivider />
      <VCardText>
        Удалить из списка товар "{{ itemToDelete?.name }}"?
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" color="primary" @click="isDeleteDialogOpen = false">Отмена</VBtn>
        <VBtn variant="text" color="primary" @click="deleteItem">Удалить</VBtn>
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
