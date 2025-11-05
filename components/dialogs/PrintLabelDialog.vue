<script setup lang="ts">
import { useRuntimeConfig } from 'nuxt/app';
import { computed, defineEmits, defineProps, ref } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import type { NewLabelInterface } from '../../types/label';
import type { Printer } from '../../types/printer';
import type { ProductSizeWithLabels } from '../../types/productSize';

interface Props {
  visible: boolean
  label: NewLabelInterface | null
  size: ProductSizeWithLabels | null
  selectdTemplate: '1' | '2' | '3'
  printer: Printer | null
  coefficient: number
}

const loading = ref(false)
const loadingPreview = ref(false)
const generatingModal = ref(false)

const props = defineProps<Props>()
const { onLabelsUpdated } = useLabelEvents()
const emit = defineEmits<{
  (e: 'download-started', callback: (result: boolean) => void): void
  (e: 'update:visible', v: boolean): void
  (e: 'printer-updated', v: number | null): void
}>()

const shouldShowGeneratingModal = computed(() => {
  return generatingModal.value && totalLabels.value > 100
})

const snackbar     = ref(false)
const snackMessage = ref('')
const snackColor   = ref<'success'|'error'>('success')

const pageCountCoefficient = computed(() => {
  let coef = 1

  let doubleEan13 = props.label?.print_double_ean13 || false
  let singleEan13 = props.label?.print_single_ean13 || false
  let doubleDM = props.label?.duplicate_chz || false

  const templateId = props.label?.label_template_id

  if (doubleEan13) singleEan13 = false
  if (!templateId) return coef
  if (templateId === 1) return coef

  if (doubleEan13) coef = coef + 2
  if (singleEan13) coef = coef + 1
  if (doubleDM) coef = coef + 1
  return coef
})

const labelCount = ref<number>(1)
const availableLabelsCount = computed(() => props.size?.available_count || 0)

const isLowAvailableLabelsCount = computed(() => 
  availableLabelsCount.value <= 0
)

const totalLabels = computed(() => {
  return labelCount.value ? labelCount.value * pageCountCoefficient.value : 0
})

const labelError = computed(() => {
  const MAX_LABELS = 500
  if (!labelCount.value || labelCount.value == 0) {
    return 'Поле обязательное'
  }
  
  if (labelCount.value < 0) {
    return 'Только положительное число'
  }

  if (totalLabels.value > MAX_LABELS) {
    return `Максимальное итоговое количество: ${MAX_LABELS} шт.`
  }
  
  return null
})

function close() {
  emit('update:visible', false)
}

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isSuccess) {
    snackColor.value = 'success'
  } else {
    snackColor.value = 'error'
  }
}

async function saveAndeDownloadFile() {
  emit('download-started', async (saveResult: boolean) => {
    if (!saveResult) {
      showSnackbar("Не удалось сохранить данные", false)
      return
    }
    
    await downloadFile()
  })
}

async function saveAndeDownloadPreviewFile() {
  emit('download-started', async (saveResult: boolean) => {
    if (!saveResult) {
      showSnackbar("Не удалось сохранить данные", false)
      return
    }
    
    await downloadPreviewFile()
  })
}

const generateFileName = (labelName: string, size: string, isPreview: boolean = false): string => {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')

  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${ms}`
  
  const safeName = labelName.replace(/\s+/g, '_')
  const safeSize = size.replace(/\s+/g, '_')
  
  return isPreview ? `Предпросмотр_${safeName}_${safeSize}_${dateStr}.pdf` : `${safeName}_${safeSize}_${dateStr}.pdf`
}

const createRequest = (endpoint: 'preview' | 'print', payload: any): Promise<Response> => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl
  const token = localStorage.getItem('access_token') || ''
  const currentClientId = localStorage.getItem('current_client_id') || ''
  
  return fetch(`${baseURL}/api/labels-pdf/${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Client-Id': currentClientId
    },
    body: JSON.stringify(payload),
  })
}

async function downloadFile() {
  if (labelError.value) {
    let errorMessage = 'Введте число больше 0'

    if (props.selectdTemplate == '1' && isLowAvailableLabelsCount.value) {
      errorMessage = 'Недостаточно этикеток для печати'
    }
    showSnackbar(errorMessage, false)
    loading.value = false
    return
  }

  loading.value = true
  if (totalLabels.value > 100) {
    generatingModal.value = true
  }

  if (labelCount.value == null || labelCount.value == 0) {
    showSnackbar('Укажите количество этикеток', false)
    generatingModal.value = false
    loading.value = false
    return
  }
  const size = props.size
  const label = props.label
  if (!size || !size.id) {
    showSnackbar('Укажите размер', false)
    generatingModal.value = false
    loading.value = false
    return
  }

  if (!label || !label.id) {
    showSnackbar("Укажите этикетку", false)
    generatingModal.value = false
    loading.value = false
    return
  }

  const printerId = props.printer?.id
  if (!printerId) { 
    showSnackbar("Выберете принтер", false)
    generatingModal.value = false
    loading.value = false
    return
  }

  const printerLabelsCount = props.printer?.labels_count
  if (!printerLabelsCount || printerLabelsCount < totalLabels.value) { 
    showSnackbar("Недостаточно этикеток в принтере", false)
    generatingModal.value = false
    loading.value = false
    return
  }

  const payload = {
    label_id: props.label.id,
    size_id: size.id,
    quantity: labelCount.value,
  }

  try {
    const response = await createRequest('print', payload)

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status == 422 && errorData.error) {
        showSnackbar(errorData.error, false)
        return
      }
      throw new Error('Неизвестная ошибка')
    }

    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = generateFileName(props.label.name, size.value)

    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    generatingModal.value = false
    showSnackbar('Произошла непредвиденная ошибка. Повторите попытку позже или обратитесь к администратору.', false)
  } finally {
    onLabelsUpdated()
    loading.value = false
    emit('printer-updated', printerId)
    generatingModal.value = false
    close()
  }
}

async function downloadPreviewFile() {
  loadingPreview.value = true

  const size = props.size
  const label = props.label
  if (!size || !size.id) {
    showSnackbar('Укажите размер', false)
    return
  }

  if (!label || !label.id) {
    showSnackbar('Укажите этикетку', false)
    return
  }

  const payload = {
    label_id: props.label.id,
    size_id: size.id,
  }

  try {
    const response = await createRequest('preview', payload)

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status == 422 && errorData.error) {
        showSnackbar(errorData.error, false)
        return
      }
      throw new Error('Неизвестная ошибка')
    }

    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = generateFileName(props.label.name, size.value, true)

    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    showSnackbar('Произошла непредвиденная ошибка. Повторите попытку позже или обратитесь к администратору.', false)
  } finally {
    loadingPreview.value = false
    close()
  }
}
</script>

<template>
  <VDialog
    v-model="props.visible"
    max-width="600"
  >
    <DialogCloseBtn @click="close" />
    <VCard :title="`Форма печати: ${props.label?.name || ''}`">
      <VCardText>
        <VCol cols="12" class="pa-0">
          <VRow align="center">
            <VCol cols="6" class="pb-0">
              <VLabel class="text-body-4 text-high-emphasis">Количество этикеток</VLabel>
            </VCol>
            <VCol cols="6" class="pb-0">
              <VLabel class="text-body-4 text-high-emphasis">С учетом опций создано будет: </VLabel>
            </VCol>
          </VRow>

          <VRow align="start" class="pt-0 mt-0">
            <VCol cols="6">
              <AppTextField
                type="number"
                v-model="labelCount"
                :error="labelError"
                :error-messages="labelError"
              />
            </VCol>
            <VCol cols="6">
              <VChip style="margin-top: 3px;" color="primary" variant="flat">
                {{ totalLabels }} шт.
              </VChip>
            </VCol>
          </VRow>

          <VCol class="pa-4 mt-6" style="border-radius: 12px; border: 1px solid #e0e0e0;">
            <!-- Первый блок: выбор принтера -->
           <PrinterInfo :printer="printer" @printer-updated="emit('printer-updated', $event)"/>

            <!-- Второй блок: количество ЧЗ -->
            <VRow align="center" no-gutters>
              <VCol cols="auto">
                <VAvatar size="34"   class="me-2" rounded>
                  <img v-bind="props" src="/icons/chz.svg" alt="Честный знак" />
                </VAvatar>
              </VCol>

              <VCol cols="6" class="d-flex align-center">
                <div class="font-weight-medium text-high-emphasis">Количество ЧЗ</div>
              </VCol>

              <VCol cols="4" class="d-flex align-center justify-end">
                <VTextField
                style="margin-left: 20px; padding: 0"
                  :model-value="availableLabelsCount"
                  readonly
                  variant="plain"
                  :class="[
                    'font-weight-medium',
                    'ps-4',
                    isLowAvailableLabelsCount ? 'text-error' : 'text-default'
                  ]"
                />
                
              </VCol>
            </VRow>
          </VCol>
        </VCol>
      </VCardText>

      <VCardText class="d-flex justify-space-between align-center">
        <div>
          <VBtn
            variant="outlined"
            color="grey"
            :loading="loadingPreview"
            :disabled="loadingPreview"
            @click="saveAndeDownloadPreviewFile"
          >
            Предпросмотр <VIcon class="ms-1" size="18" icon="tabler-eye" />
          </VBtn>
        </div>

        <div>
          <VBtn variant="tonal" class="me-3" color="secondary" @click="close">Отменить</VBtn>
        
          <VBtn
            color="primary"
            :loading="loading"
            :disabled="loading"
            @click="saveAndeDownloadFile"
          >
            Скачать этикетку
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
  
  <VDialog
    v-model="shouldShowGeneratingModal"
    persistent
    max-width="400"
  >
    <VCard>
      <VCardText class="text-center pt-4">
        <VProgressCircular
          indeterminate
          color="primary"
          size="64"
          class="mb-4"
        />
        <div class="text-h6 mb-2">Генерация PDF</div>
        <div class="text-body-2 text-medium-emphasis">
          Идет создание документа с {{ totalLabels }} этикетками<br>
          Не закрывайте страницу
        </div>
      </VCardText>
      <VCardActions>
    </VCardActions>
    </VCard>
    
  </VDialog>

  <template>
    <VSnackbar
      v-model="snackbar"
      :timeout="3000"
      :color="snackColor"
      location="top right"
    >
      {{ snackMessage }}
    </VSnackbar>
  </template>
</template>
