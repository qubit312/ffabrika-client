<script setup lang="ts">
import type { ProductSize } from '@/types/productSize'
import { computed, reactive, ref, watch } from 'vue'
import { useLabelEvents } from '../../composables/useLabelBus'
import { importCzCsv, importCzPdf } from '../../services/chz'
import { getProductSizes } from '../../services/productSizes'

interface ImportCsvResponce {
  fileName: string
  created: number
  errors: {
    code: string
    message: string
  }[]
}

interface ImportPdfResponce {
  fileName: string
  message: string
}

interface Props {
  modelValue: boolean
  files: File[]
  productId: number
  type?: 'csv' | 'pdf'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, v => (isOpen.value = v))
watch(isOpen, v => emit('update:modelValue', v))
const { onLabelsUpdated } = useLabelEvents()
const localMap = ref<Record<number, string>>({})
const sizeOptions = ref<{ label: string; value: string }[]>([])
const loading = ref(false)

const resultDialog = reactive({
  show: false,
  items: [] as ImportCsvResponce[] | null
})

const pdfResultDialog = reactive({
  show: false,
  items: [] as ImportPdfResponce[] | null,
})

function showResultDialog(errors: ImportCsvResponce[] | null) {
  resultDialog.show = true
  resultDialog.items = errors
}

watch(
  () => [isOpen.value, props.productId],
  ([open]) => {
    if (open) fetchSizes()
  }
)

const isFormValid = computed(() =>
  props.files.length > 0
    ? props.files.every((_, idx) => !!localMap.value[idx])
    : false
)

function close() {
  isOpen.value = false
}

async function fetchSizes() {
  loading.value = true
  try {
    const { data, error } = await getProductSizes(props.productId)

    if (error.value) {
      console.error('Ошибка загрузки размеров:', error.value)
      sizeOptions.value = []
      return
    }

    sizeOptions.value = data.value.data.map((ps: ProductSize) => ({
      value: String(ps.id),
      label: ps.value,
    }))
  } catch (e) {
    console.error('Непредвиденная ошибка при загрузке размеров:', e)
    sizeOptions.value = []
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!isFormValid.value) return

  const formData = new FormData()
  props.files.forEach((file, idx) => {
    formData.append('file[]', file)
    formData.append('size_id[]', localMap.value[idx])
  })

  loading.value = true
  try {
    if (props.type === 'pdf') {
      // 🔹 импорт PDF
      const { data, error } = await importCzPdf(formData)
      if (error.value) throw new Error(error.value)

      // результат PDF
      const pdfResults: ImportPdfResponce[] = data.value.data ?? []
      pdfResultDialog.items = pdfResults
      pdfResultDialog.show = true

      // закрываем окно, если нужно
      close()
    } else {
      // 🔹 импорт CSV
      const { data, error } = await importCzCsv(formData)
      if (error.value) throw new Error(error.value)

      const csvResults: ImportCsvResponce[] = data.value ?? []
      const hasErrors = csvResults.some(f => f.errors?.length)
      showResultDialog(csvResults)

      if (!hasErrors) close()
      onLabelsUpdated()
    }
  } catch (err: any) {
    console.error('Ошибка при импорте:', err)
    showResultDialog(null)
  } finally {
    loading.value = false
  }
}

interface GroupedError {
  fileName: string
  created: number
  errorCount: number
  errors: { message: string; quantity: number }[]
}

function groupByFileName(data: ImportCsvResponce[]): GroupedError[] {
  return data.map(file => {
    const grouped: Record<string, number> = {}
    const errorCount = file.errors.length

    for (const err of file.errors) {
      grouped[err.message] = (grouped[err.message] || 0) + 1
    }

    const groupedErrors = Object.entries(grouped).map(([message, quantity]) => ({
      message,
      quantity,
    }))

    return {
      fileName: file.fileName,
      created: file.created,
      errorCount: errorCount,
      errors: groupedErrors,
    }
  })
}

function getStatusIcon(errors: number, created: number): string {
  if (errors === 0) return 'tabler-circle-check'
  if (errors > 0 && created > 0) return 'tabler-alert-triangle'
  return 'tabler-circle-x'
}

function getStatusColor(errors: number, created: number): string {
  if (errors === 0) return 'success'
  if (errors > 0 && created > 0) return 'warning'
  return 'error'
}
</script>

<template>
  <VDialog v-model="isOpen" max-width="700px">
    <VCard class="pt-2 pb-2">
      <VCardTitle>Соответствие размеров</VCardTitle>
      <VCardText class="pa-4">
        <div v-if="loading && sizeOptions.length === 0" class="text-center">
          <VProgressCircular indeterminate size="40" width="4" />
          <div class="mt-2">Загрузка размеров…</div>
        </div>

        <div v-else>
          <VRow
            v-for="(file, idx) in props.files"
            :key="idx"
            class="mb-2 align-center"
          >
            <VCol cols="6">
              {{ file.name }}
            </VCol>
            <VCol cols="6">
              <AppSelect
                v-model="localMap[idx]"
                :items="sizeOptions"
                item-title="label"
                item-value="value"
                placeholder="Выберите размер"
                clearable
                outlined
                :rules="[v => !!v || 'Обязательное поле']"
              />
            </VCol>
          </VRow>
          <div v-if="sizeOptions.length === 0" class="text-caption text-center">
            Для этого товара нет доступных размеров.
          </div>
        </div>
      </VCardText>
      <VCardActions class="pe-4">
        <VSpacer />
        <VBtn @click="close">Закрыть</VBtn>
        <VBtn
          variant="flat"
          color="primary"
          @click="onSave"
          :disabled="loading || !isFormValid"
        >
          <template #default>
            <span v-if="loading">
              <VProgressCircular
                indeterminate
                size="20"
                width="2"
              />
            </span>
            <span v-else>Сохранить</span>
          </template>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="resultDialog.show" max-width="650px" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <span>
          Результат обработки CSV
        </span>
      </VCardTitle>

      <VCardText class="pt-2 pb-2 ps-4 pe-4">
        <div>
          <ul style="list-style-type: none; padding-left: 0;">
            <li
              v-for="item in groupByFileName(resultDialog.items || [])"
              :key="item.fileName"
              class="mb-4"
            >
              <div class="d-flex align-center">
                <span v-if="item.errorCount">
                  <VIcon
                    :color="getStatusColor(item.errorCount, item.created)"
                    class="me-1"
                  >
                  {{ getStatusIcon(item.errorCount, item.created) }}
                  </VIcon> 
                  Импорт файла <strong>{{ item.fileName }}</strong> завершен с ошибками.
                  <span v-if="item.errorCount > 0">
                    Загружено {{ item.created }}.
                  </span>
                </span>

                <span v-if="!item.errorCount">
                  <VIcon
                    :color="getStatusColor(item.errorCount, item.created)"
                    class="me-1"
                  >
                  {{ getStatusIcon(item.errorCount, item.created) }}
                  </VIcon> 
                  <strong>{{ item.fileName }}</strong>
                  <span v-if="!item.errorCount"> — {{ item.created }} шт.</span>
                </span>
              </div>
              <span v-if="item.errorCount"></span>
              <ul style="list-style-type: none;" class="mt-1 ps-8">
                <li v-for="(err, idx) in item.errors" :key="idx">
                   {{ err.message }} — {{ err.quantity }} шт.
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" color="primary" @click="resultDialog.show = false">Закрыть</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Окно для PDF -->
  <VDialog v-model="pdfResultDialog.show" max-width="600px" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <span>Результат обработки PDF</span>
      </VCardTitle>

      <VCardText class="pt-2 pb-2 ps-4 pe-4">
        <div v-if="pdfResultDialog.items && pdfResultDialog.items.length">
          <span class="mb-1">Файлы приняты в обработку: </span>
          <ul style="list-style-type: none; padding-left: 0;">
            <li
              v-for="item in pdfResultDialog.items"
              :key="item.fileName"
              class="mb-3"
            >
              <VIcon icon="tabler-circle-check" color="success" class="me-1" />
              <strong>{{ item.fileName }}</strong>
              <div class="text-body-2 mt-1 text-medium-emphasis">
                {{ item.message }}
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="text-center text-medium-emphasis">
          Нет данных для отображения.
        </div>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" color="primary" @click="pdfResultDialog.show = false">Закрыть</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

</template>
