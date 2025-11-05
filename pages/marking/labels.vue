<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { markLabelsAsDefective } from '@/services/chz'
import { useDebounce } from '@vueuse/core'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProduct } from '~/services/products'

type ChzApiItem = {
  id: number
  size_id: number
  code: string
  status: string
  used: boolean
  created_at: string
  created_by: { id: number; name: string }
  used_at: string
  used_by: { id: number; name: string }
  size?: { id: number; product_id: number; value: string; barcode: string }
}

const route = useRoute()
const router = useRouter()
const itemsPerPage = ref<number>(25)
const page = ref<number>(1)
const totalEntities = ref<number>(0)

const productId = computed(() => Number(route.query.product_id || 0))
const sizeId = computed(() => Number(route.query.size_id || 0))
const sizeValue = computed(() => String(route.query.size || ''))
const usedFilter = computed<true | false | undefined>(() => {
  const raw = route.query.used
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return undefined
})

const status = computed<'used' | 'available' | ''>(() => {
  const raw = route.query.used
  if (raw === '1' || raw === 'true') return 'used'
  if (raw === '0' || raw === 'false') return 'available'
  return ''
})

const loading = ref(false)
const loadingDefective = ref(false)
const errorMessage = ref('')
const rows = ref<ChzApiItem[]>([])
const productName = ref<string>('')

const searchCode = ref<string>('')
const debouncedCode = useDebounce(searchCode, 400)
const selectedCodes = ref([])

const snackbar = reactive({ show: false, text: '', color: 'success' as 'success'|'error' })

function prettyGtin(code: string) {
  if (!code) return ''

  const g1 = code.slice(0, 2)
  const g2 = code.slice(2, 16)

  return `(${g1})${g2}`
}

function prettySerialNumber(code: string) {
  if (!code) return ''

  const g3 = code.slice(16, 18)
  const g4 = code.slice(18, 31)

  return `(${g3})${g4}`
}

interface Filter {
  field: string;
  op: 'eq' | 'ne' | 'gt' | 'like' | 'le' | 'ge';
  value: string | number | boolean | Array<string | number>;
}

interface LabelData {
  id: number
  product_id: number;
  product_name: string;
  size_value: string;
  size_id: number;
  barcode: string;
  total: number;
  used: number;
  unused: number;
}

interface MetaData {
  grouped_by: string;
  total_groups: number;
}

interface ApiResponse {
  data: LabelData[];
  meta: MetaData;
}

interface FilterPayload {
  filters: Filter[];
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  page: number;
  per_page: number;
  group_by_size: boolean;
}

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.show = true
  snackbar.text = message
  if (isSuccess) {
    snackbar.color = 'success'
  } else {
    snackbar.color = 'error'
  }
}

watch([page, itemsPerPage], () => {
  fetchAll()
})

watch([debouncedCode], () => {
  page.value = 1
  fetchAll()
})

async function submitDefective(ids: number[]) {
  if (!ids.length) {
    showSnackbar('Укажите хотя бы один корректный Id (число ≥ 1)', false)
    return
  }

  loadingDefective.value = true
  try {
    const { data, error } = await markLabelsAsDefective(ids, '')

    if (error.value) {
      showSnackbar(error.value.message || 'Ошибка при запросе', false)
      loadingDefective.value = false
      return
    }

    if (!data.value?.success) {
      showSnackbar(data.value?.message || 'Ничего не изменено', false)
      loadingDefective.value = false
      return
    }

    const okMsg = data.value.message
      ? data.value.message
      : `Восстановлено: ${data.value.data?.length ?? ids.length} шт.`
    showSnackbar(okMsg, true)
    fetchAll()
    selectedCodes.value = []
  } catch (err: any) {
    showSnackbar(err.message || 'Внутренняя ошибка', false)
    console.error('Ошибка восстановления (ids:', ids, '):', err)
  } finally {
    loadingDefective.value = false
  }
}

async function fetchAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    if (productId.value) {
      const { data, error } = await getProduct(productId.value)
      if (!error.value) productName.value = (data.value as any)?.name || `Товар #${productId.value}`
    }

    const filterPayload: FilterPayload = {
      filters: [],
      sort_by: sortBy.value?.key || 'id',
      sort_dir: sortBy.value?.order || 'desc',
      page: page.value,
      per_page: itemsPerPage.value,
      group_by_size: false
    }

    if (sizeId.value) {
      filterPayload.filters.push({ field: 'size_id', op: 'eq', value: sizeId.value })
    }

    if (status.value) {
      filterPayload.filters.push({ field: 'status', op: 'eq', value: status.value })
    }

    if (searchCode.value) {
      filterPayload.filters.push({ field: 'code', op: 'like', value: searchCode.value })
    }

    if (selectedDateTimeField.value) {
      const dateTimeRange = getDateTimeRange()

      if (dateTimeRange && dateTimeRange.starts_at) {
        filterPayload.filters.push({ field: selectedDateTimeField.value, op: 'ge', value: dateTimeRange.starts_at})
      }

      if (dateTimeRange && dateTimeRange.ends_at) {
        filterPayload.filters.push({ field: selectedDateTimeField.value, op: 'le', value: dateTimeRange.ends_at })
      }
    }

    const { data, error } = await useApi<ApiResponse>('/api/chestny-znak-labels/filters', {
      method: 'POST',
      body: filterPayload
    })
    if (data.value) {
      if (data.value.data && Array.isArray(data.value.data)) {
        rows.value = data.value.data as ChzApiItem[]
      }
      if (data.value.meta) {
        totalEntities.value = data.value.meta.total || rows.value.length
      }
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || 'Ошибка загрузки меток'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

const baseHeaders = [ 
  { title: 'GTIN', key: 'code1', sortable: false },
  { title: 'Серийный номер', key: 'code2', sortable: false },
]

const endHeaders = [ 
  { title: 'Действия', key: 'action', sortable: false, width: 50 },
]

const usedHeaders = [
  { title: 'Дата использования', key: 'used_at', sortable: true },
  { title: 'Использовал', key: 'used_by', sortable: false },
]

const createdHeaders = [
  { title: 'Дата Создания', key: 'created_at', sortable: true },
  { title: 'Создал', key: 'created_by', sortable: false },
]

const headers = computed(() => {
  let result = [...baseHeaders]
  
  if (status.value === 'used') {
    result = [...result, ...usedHeaders, createdHeaders[0], ...endHeaders]
  } else {
    result = [...result, ...createdHeaders]
  }
  
  return result
})

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const onOptionsUpdate = (options: any) => {
  if (options.sortBy?.length > 0) {
    const field = options.sortBy[0]
    if (['used_at', 'created_at', 'id'].includes(field.key)) {
      sortBy.value = field
    } else {
      sortBy.value = null
    }
  } else {
    sortBy.value = null
  }

  fetchAll()
}

const confirmDialog = ref(false)
const confirmMessage = ref('')
const confirmCode = ref('')
const pendingAction = ref()

const confirmCancelUsage = (item: ChzApiItem) => {
  confirmMessage.value = 'Вы уверены, что хотите отменить использование знака?'
  confirmCode.value = prettySerialNumber(item.code)
  pendingAction.value = () => cancelSingleUsage(item)
  confirmDialog.value = true
}

const confirmCancelSelectedUsage = () => {
  confirmCode.value = ''
  confirmMessage.value = `Вы уверены, что хотите отменить использование ${selectedCodes.value.length} выбранных знаков?`
  pendingAction.value = cancelSelectedUsage
  confirmDialog.value = true
}

const executeCancelAction = () => {
  if (pendingAction.value) {
    pendingAction.value()
  }
  confirmDialog.value = false
  pendingAction.value = null
}

const cancelSingleUsage = async (item: ChzApiItem) => {
  try {
    const ids: number[] = []
    if (item.id) {
      ids.push(item.id)
    }
    submitDefective(ids)
  } catch (error) {
    console.error('Ошибка при отмене использования:', error)
  }
  confirmCode.value = ''
}

const cancelSelectedUsage = async () => {
  try {
    const ids = [...selectedCodes.value].filter((id): id is number => 
      typeof id === 'number' && !isNaN(id)
    )
    submitDefective(ids)
    selectedCodes.value = []
  } catch (error) {
    console.error('Ошибка при отмене использования выбранных знаков:', error)
  }
}

const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')
const selectedDateTimeField = ref('')

const startDateTime = computed(() => {
  if (!startDate.value || !startTime.value) return null
  return new Date(`${startDate.value}T${startTime.value}`)
})

const endDateTime = computed(() => {
  if (!endDate.value || !endTime.value) return null
  return new Date(`${endDate.value}T${endTime.value}`)
})

const validateDates = () => {
  errorMessage.value = ''

  if (startDate.value && endDate.value) {
    if (startDate.value > endDate.value) {
      errorMessage.value = 'Дата начала не может быть позже даты окончания'
    }
  }
}

const validateTimes = () => {
  errorMessage.value = ''

  if (startDateTime.value && endDateTime.value) {
    if (startDateTime.value >= endDateTime.value) {
      errorMessage.value = 'Время начала не может быть позже или равно времени окончания'
    }
  } else if (startDate.value && endDate.value && startDate.value === endDate.value) {
    if (startTime.value && endTime.value && startTime.value >= endTime.value) {
      errorMessage.value = 'Время начала должно быть раньше времени окончания'
    }
  }
}

const formatForRequest = (dateStr: string, timeStr: string) => {
  const time = timeStr ? timeStr : '00:00' 
  if (!dateStr) return null
  return `${dateStr} ${time}:00`
}

const getDateTimeRange = () => {
  if (!startDate.value && !endDate.value) return null

  const startsAt = formatForRequest(startDate.value, startTime.value)
  const endsAt = formatForRequest(endDate.value, endTime.value)

  if (!startsAt && !endsAt) return null

  return { starts_at: startsAt, ends_at: endsAt }
}

const dateTimeFields = [
  { title: 'Дата обновления', value: 'created_at' },
  { title: 'Дата создания', value: 'updated_at' },
  { title: 'Дата использования', value: 'used_at' },
]

watch([startDate, startTime, endDate, endTime, selectedDateTimeField], () => {
  validateDates()
  validateTimes()
  fetchAll()
})

const clearFilters = () => {
  selectedDateTimeField.value = '';
  startDate.value = '';
  startTime.value = '';
  endDate.value = '';
  endTime.value = '';
  fetchAll()
}

const hasActiveFilters = computed(() => {
  return selectedDateTimeField.value || 
    startDate.value || 
    startTime.value || 
    endDate.value || 
    endTime.value
})

</script>

<template>
  <VCard>
    <VCardText>
      <span class="v-card-title pa-0">Маркировка Честный Знак</span>
    </VCardText>
    <VDivider />
    <VCardText>
      <div class="d-flex justify-space-between align-start mb-4">
        <div class="text-medium-emphasis">
          Товар: <strong>{{ productName || ('#' + productId) }}</strong>
          <span v-if="sizeValue"> • Размер: <strong>{{ sizeValue }}</strong></span>
          <span v-if="usedFilter !== undefined"> • {{ usedFilter ? 'Использованные' : 'Неиспользованные' }}</span>
          <p>Количество <strong>{{totalEntities || ''}}</strong></p>
        </div>
        <div>
          <VBtn variant="tonal" prepend-icon="tabler-arrow-left" @click="router.back()">Назад</VBtn>
        </div>
      </div>
 
      <div class="d-flex flex-wrap">
        <div class="d-flex align-center" v-if="status === 'used'">
          <VTooltip :disabled="selectedCodes.length > 0">
            <template #activator="{ props }">
              <div v-bind="props">
                <VBtn
                  density="compact"
                  color="primary"
                  @click="confirmCancelSelectedUsage"
                  class="me-2"
                  :disabled="!selectedCodes.length"
                >
                  Отменить использование
                </VBtn>
              </div>
            </template>
            <span v-if="!selectedCodes.length">Необходимо выбрать записи</span>
          </VTooltip>
        </div>

        <div class="d-flex align-center">
          <AppTextField
            v-model="searchCode"
            density="compact"
            placeholder="Введите код, например: 215FU9Y;abcde21fg"
            style="inline-size: 400px;"
            clearable
          />
          <VTooltip text="Введите ЧЗ без скобок в префиксах (01) и (21).">
            <template #activator="{ props }">
              <VBtn v-bind="props" icon="tabler-help" variant="text" />
            </template>
          </VTooltip>
        </div>
      </div>

      <div class="d-flex align-center mt-4 mb-4">
        <VSelect
          density="compact"
          v-model="selectedDateTimeField"
          :items="dateTimeFields"
          label="Поле даты"
          variant="outlined"
          style="max-width: 220px"
          class="me-4"
        />

        <div class="date-time-field">
          <div class="d-flex gap-2">
            <AppTextField
              v-model="startDate"
              density="compact"
              type="date"
              :max="endDate || undefined"
              @update:model-value="validateDates"
            />
            <AppTextField
              v-model="startTime"
              density="compact"
              type="time"
              step="1800"
              @update:model-value="validateTimes"
            />
          </div>
        </div>

        <VIcon icon="tabler-minus" size="12" class="ms-1 me-1"/>

        <div class="date-time-field">
          <div class="d-flex gap-2">
            <AppTextField
              v-model="endDate"
              density="compact"
              type="date"
              :min="startDate || undefined"
              @update:model-value="validateDates"
            />
            <AppTextField
              v-model="endTime"
              density="compact"
              type="time"
              step="1800"
              @update:model-value="validateTimes"
            />
          </div>
        </div>

        <VBtn
          color="error"
          density="comfortable"
          class="ms-4"
          @click="clearFilters"
          :disabled="!hasActiveFilters"
        >
          <VIcon icon="tabler-filter-off" size="16" class="me-1" />
        </VBtn>
      </div>

      <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>

      <VDataTableServer
        show-select
        :headers="headers"
        :items="rows"
        :items-length="rows.length"
        :loading="loading"
        class="text-no-wrap"
        v-model="selectedCodes"
        @update:options="onOptionsUpdate"
      >
        <template #loading>
          <div class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate size="40" />
          </div>
        </template>

        <template #item.code1="{ item }">
          <span class="mono hoverable pointer">{{ prettyGtin(item.code) }}</span>
        </template>

        <template #item.code2="{ item }">
          <span class="mono hoverable pointer">{{ prettySerialNumber(item.code) }}</span>
        </template>

        <template #item.used_at="{ item }">
          <span class="hoverable pointer">{{ new Date(item.used_at).toLocaleString() }}</span>
        </template>

        <template #item.used_by="{ item }">
          <span class="hoverable pointer">{{ item.used_by?.name || ''  }}</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="hoverable pointer">{{ new Date(item.created_at).toLocaleString() }}</span>
        </template>

        <template #item.created_by="{ item }">
          <span class="hoverable pointer">{{ item.created_by?.name || ''  }}</span>
        </template>

        <template #item.action="{ item }">
          <div class="text-center">
            <VBtn
              icon="tabler-arrow-back"
              variant="text"
              @click="confirmCancelUsage(item)"
              title="Отменить использование знака"
            />
          </div>
        </template>

        <template #bottom>  
          <VCardText class="pt-2">
            <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
              <div class="d-flex align-center gap-2">
                <span>Записей на странице</span>
                <VSelect
                  v-model="itemsPerPage"
                  :items="[5, 10, 25, 50, 100]"
                  style="max-inline-size: 8rem;min-inline-size: 5rem;"
                />
              </div>

              <VPagination
                v-model="page"
                :total-visible="$vuetify.display.smAndDown ? 3 : 5"
                :length="Math.ceil(totalEntities / itemsPerPage)"
              />
            </div>
          </VCardText>
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="3000"
    location="top right"
  >
    {{ snackbar.text }}
  </VSnackbar>

  <VDialog v-model="confirmDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        Подтверждение действия
      </VCardTitle>
      <VDivider />
      <VCardText>
        {{ confirmMessage }}
        <strong v-if="confirmCode">{{confirmCode}}</strong>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" @click="confirmDialog = false">Закрыть</VBtn>
        <VBtn variant="outlined" @click="executeCancelAction">Подтвердить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.date-time-range {
  max-width: 800px;
}

.date-time-field {
  min-width: 300px;
}

.gap-4 {
  gap: 16px;
}
</style>
