<script setup lang="ts">
import { getFileOperations, type FileOperation, type PaginatedResponse } from '@/services/fileOperations'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, val => (isOpen.value = val))
watch(isOpen, val => emit('update:modelValue', val))

// данные и состояние
const operations = ref<FileOperation[]>([])
const totalOperations = ref<number>(0)
const page = ref(1)
const itemsPerPage = ref(10)
const loading = ref(false)

const refreshInterval = ref<number | null>(null)

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  refreshInterval.value = setInterval(() => {
    if (isOpen.value) {
      fetchFileOperations(false)
    }
  }, 3000) as unknown as number
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

watch(() => [page.value, itemsPerPage.value], () => {
  fetchFileOperations()
})

onMounted(() => {
  if (isOpen.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

async function fetchFileOperations(showLoading: boolean = true) {
  loading.value = true && showLoading
  const { data, error } = await getFileOperations({
    page: page.value,
    per_page: itemsPerPage.value,
  })

  if (error.value) {
    console.error('Ошибка при загрузке операций:', error.value)
  } else if (data.value) {
    const response = data.value as PaginatedResponse<FileOperation>
    operations.value = response.data
    totalOperations.value = response.total
  }

  loading.value = false
}

watch(isOpen, val => {
  if (val) {
    fetchFileOperations()
  }
  startAutoRefresh()
})

const formatSize = (size?: number) => {
  if (!size) return '-'
  const kb = size / 1024
  return kb < 1024 ? `${kb.toFixed(1)} КБ` : `${(kb / 1024).toFixed(1)} МБ`
}

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleString('ru-RU') : '-'

const statusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'error'
    case 'in_progress':
      return 'warning'
    case 'partial_success':
      return 'warning'
    default:
      return 'grey'
  }
}

const getStatusVisibleName = (status: string) => {
  switch (status) {
    case 'success':
      return 'Выполнено'
    case 'failed':
      return 'Ошибка'
    case 'in_progress':
      return 'В процессе'
    case 'partial_success':
      return 'С замечаниями'
    default:
      return status || ''
  }
}

const headers = [
  { title: 'Имя файла', key: 'file_name', sortable: false, width: 200 },
  { title: 'Размер', key: 'file_size', sortable: false },
  { title: 'Статус', key: 'status', sortable: false },
  { title: 'Создан', key: 'created_at', sortable: false },
  { title: 'Завершен', key: 'finished_at', sortable: false },
]

const errorDialog = ref(false)
const errorDetails = ref<{ file_name?: string; error?: ErrorSummary | null }>({})

interface ErrorSummary {
  summary?: {
    total: number
    success: number
    failed: number
  }
  details?: Record<string, number>
}

function showErrorDetails(item: FileOperation) {
  let parsedError: ErrorSummary | null = null
  const rawMessage = item.error_message

  try {
    parsedError =
      typeof rawMessage === 'string'
        ? JSON.parse(rawMessage)
        : rawMessage

    console.log(parsedError)
  } catch {
    parsedError = {
      details: {
        [rawMessage || 'Произошла ошибка при выполнении операции']: 1,
      },
    }
  }

  if (item.status === 'failed') {
    parsedError = {
      details: {
        [rawMessage || 'Произошла ошибка при выполнении операции']: 1,
      },
    }
  }

  if (!parsedError?.details && !parsedError?.summary) {
    parsedError = {
      details: {
        [rawMessage || 'Ошибка при обработке']: 1,
      },
    }
  }

  errorDetails.value = {
    file_name: item.file_name,
    error: parsedError,
  }
  errorDialog.value = true
}

</script>

<template>
  <VDialog v-model="isOpen" max-width="1100">
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        <div class="d-flex align-center">
          <span>История загрузок</span>
          <VBtn
            class="ms-4"
            variant="flat"
            density="comfortable"
            color="primary"
            @click="fetchFileOperations()"
          >
            <VIcon class="me-2" icon="tabler-refresh" />
            Обновить список
          </VBtn>
        </div>
        <VBtn icon="tabler-x" variant="text" @click="isOpen = false" />
      </VCardTitle>

      <VCardText class="table-container">
        <VDataTable
          :headers="headers"
          :items="operations"
          class="product-table text-wrap"
          :items-per-page="itemsPerPage"
          :page="page"
          :loading="loading"
        >
          <template #loading>
            <div class="d-flex justify-center pa-8">
              <VProgressCircular indeterminate size="40" />
            </div>
          </template>

          <template #no-data>
            <div class="text-medium-emphasis text-center py-8">Данных не найдено</div>
          </template>

          <template #item.file_name="{ item }" class="min-width: 420px">
            <VTooltip location="top">
              <template #activator="{ props }">
                <span
                  v-bind="props"
                  class="truncate-cell cursor-pointer"
                >
                  {{ item.file_name }}
                </span>
              </template>
              <span>{{ item.file_name }}</span>
            </VTooltip>
          </template>

          <template #item.file_size="{ item }">
            {{ formatSize(item.file_size) }}
          </template>

          <template #item.status="{ item }">
            <div class="d-flex align-center gap-1">
              <VChip
                size="small"
                :color="statusColor(item.status)"
                class="text-white"
              >
                {{ getStatusVisibleName(item.status) }}
              </VChip>

              <!-- Кнопка с иконкой, если статус ошибка -->
              <VBtn
                v-if="(item.status === 'failed' || item.status === 'partial_success') && item.error_message"
                icon
                variant="text"
                color="error"
                density="compact"
                @click.stop="showErrorDetails(item)"
                title="Подробнее об ошибке"
                height="24"
              >
                <VIcon icon="tabler-alert-circle" />
              </VBtn>
            </div>
          </template>

          <template #item.created_at="{ item }">
            {{ formatDate(item.created_at) }}
          </template>

          <template #item.finished_at="{ item }">
            {{ formatDate(item.finished_at) }}
          </template>

          <template #bottom>
            
          </template>
        </VDataTable>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <div class="ms-6 me-6 mb-6">
          <VPagination
            v-model="page"
            :total-visible="5"
            :length="Math.ceil(totalOperations / itemsPerPage)"
          />
        </div>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="errorDialog" max-width="700">
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center ps-6 pt-4">
        <span>Результаты обработки файла</span>
      </VCardTitle>

      <VCardText>
        <p class="mb-3">
          <strong>Файл:</strong> {{ errorDetails.file_name }}
        </p>

        <template v-if="errorDetails.error?.summary">
          <VAlert
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <div>
              Успешно обработано:
              <strong>{{ errorDetails.error.summary.success }}</strong>
              из
              <strong>{{ errorDetails.error.summary.total }}</strong><br />
              Ошибки:
              <strong>{{ errorDetails.error.summary.failed }}</strong>
            </div>
            
          </VAlert>
          <div v-if="errorDetails.error.details">
            <span>Детали: </span>
            <div
              v-for="(count, msg) in errorDetails.error.details"
              :key="msg"
            >
              <span class="ms-8">{{ msg }}</span>
              <template v-if="count && count > 1"> — {{ count }} шт.</template>
            </div>
          </div>
        </template>

        <template v-else-if="errorDetails.error?.details && Object.keys(errorDetails.error.details).length">
          <VAlert
            type="error"
            variant="tonal"
            class="mb-4 text-pre-wrap"
          >
            <div
              v-for="(count, msg) in errorDetails.error.details"
              :key="msg"
            >
              <span>{{ msg }}</span>
              <template v-if="count && count > 1"> — {{ count }} шт.</template>
            </div>
          </VAlert>
        </template>

        <template v-else>
          <VAlert type="error" variant="tonal">
            Неизвестная ошибка
          </VAlert>
        </template>
      </VCardText>

      <VCardActions class="justify-end pe-6 pb-5">
        <VBtn variant="flat" @click="errorDialog = false">Закрыть</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="css">
.table-container {
  min-height: 610px;
  max-height: 610px;
}

.product-table {
  flex: 1 1 auto;
  min-height: 550px;
  min-height: 550px;
}

.product-table .v-data-table__td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 420px;
}
</style>
