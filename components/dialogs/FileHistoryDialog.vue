<script setup lang="ts">
import { getFileOperations, type FileOperation, type PaginatedResponse } from '@/services/fileOperations'
import { ref, watch } from 'vue'

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

watch(() => [page.value, itemsPerPage.value], () => {
  fetchFileOperations()
})

async function fetchFileOperations() {
  loading.value = true
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
  if (val) fetchFileOperations()
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
      return 'Выполнено с замечаниями'
    default:
      return status || ''
  }
}

const headers = [
  { title: 'Имя файла', key: 'file_name', sortable: false },
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

  try {
    // error_message приходит как JSON-строка
    parsedError =
      typeof item.error_message === 'string'
        ? JSON.parse(item.error_message)
        : item.error_message
  } catch {
    parsedError = { details: { [item.error_message || 'Неизвестная ошибка']: 1 } }
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
            class="ms-2"
            icon
            variant="text"
            color="primary"
            :loading="loading"
            @click="fetchFileOperations()"
            title="Обновить список"
          >
            <VIcon icon="tabler-refresh" />
          </VBtn>
        </div>
        <VBtn icon="tabler-x" variant="text" @click="isOpen = false" />
      </VCardTitle>

      <VCardText>
        <VDataTable
          :headers="headers"
          :items="operations"
          class="text-no-wrap product-table"
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

          <template #item.file_name="{ item }">
            {{ item.file_name }}
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
                @click.stop="showErrorDetails(item)"
                title="Подробнее об ошибке"
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
                  :length="Math.ceil(totalOperations / itemsPerPage)"
                />
              </div>
            </VCardText>
          </template>
        </VDataTable>
      </VCardText>
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
            :icon="false"
            class="mb-4"
          >
            <div class="d-flex align-center">
              <div class="me-4">
                <VIcon
                  icon="tabler-info-circle"
                  size="32"
                  class="text-info"
                  color="warning"
                />
              </div>

              <div>
                <div>
                  Успешно обработано:
                  <strong>{{ errorDetails.error.summary.success }}</strong>
                  из
                  <strong>{{ errorDetails.error.summary.total }}</strong>
                </div>
                <div class="mt-1">
                  Ошибки:
                  <strong>{{ errorDetails.error.summary.failed }}</strong>
                </div>
              </div>
            </div>
          </VAlert>
        </template>

        <template v-if="errorDetails.error?.details">
          <h4 class="text-subtitle-1 mb-2">Сводка ошибок:</h4>
          <VList density="compact" class="border rounded">
            <VListItem
              v-for="(count, msg) in errorDetails.error.details"
              :key="msg"
            >
              <VListItemTitle>{{ msg }}</VListItemTitle>
              <VListItemSubtitle>{{ count }} строк(и)</VListItemSubtitle>
            </VListItem>
          </VList>
        </template>

        <template
          v-if="!errorDetails.error?.summary && !errorDetails.error?.details"
        >
          <VAlert type="error" variant="tonal" class="text-pre-wrap mt-3">
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
