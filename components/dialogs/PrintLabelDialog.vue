<script setup lang="ts">
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
}

const loading = ref(false)
const props = defineProps<Props>()
const { onLabelsUpdated } = useLabelEvents()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'printer-updated', v: number | null): void
}>()

const snackbar     = ref(false)
const snackMessage = ref('')
const snackColor   = ref<'success'|'error'>('success')

const labelCount = ref<number>(1)
const availableLabelsCount = computed(() => props.size?.available_labels_count || 0)
const labelError = computed(() => !labelCount.value || labelCount.value <= 0)
const isLowAvailableLabelsCount = computed(() => 
  availableLabelsCount.value <= 0
)

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

async function downloadFile() {
  const printerId = props.printer?.id
  if (!printerId) { 
    showSnackbar("Выберете принтер", false)
    return
  } 

  if (labelError.value) {
    let errorMessage = 'Введте число больше 0'

    if (props.selectdTemplate == '1' && isLowAvailableLabelsCount.value) {
      errorMessage = 'Недостаточно этикеток для печати'
    }
    showSnackbar(errorMessage, false)
    return
  }

  loading.value = true
  if (labelCount.value == null || labelCount.value == 0) {
    console.error('Укажите количество этикеток')
    return
  }
  const size = props.size
  const label = props.label
  if (!size || !size.id) {
    console.error('Укажите размер')
    return
  }

  if (!label || !label.id) {
    console.error('Укажите этикетку')
    return
  }

  const payload = {
    labelId: props.label.id,
    sizeId: size.id,
    quantity: labelCount.value,
    printerId: printerId
  }

  const token = localStorage.getItem('access_token') || ''
  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBaseUrl;

    const response = await fetch(baseURL + `/api/chestny-znak-labels/download-pdf`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('Content-Type')
    if (!response.ok) {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        showSnackbar(errorData.message || 'Произошла ошибка при генерации PDF', false)
        throw new Error(errorData.message || 'Неизвестная ошибка')
      } else {
        throw new Error(`Сервер вернул ${response.status}`)
      }
    }

    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const ms = now.getMilliseconds().toString().padStart(3, '0')

    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}-${ms}`

    const safeName = props.label.name.replace(/\s+/g, '_')
    const safeSize = size.value.replace(/\s+/g, '_')
    link.download = `${safeName}_${safeSize}_${dateStr}.pdf`

    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    showSnackbar(err.message || 'Произошла непредвиденная ошибка', false)
  } finally {
    onLabelsUpdated()
    loading.value = false
    emit('printer-updated', printerId)
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
            <VCol cols="6">
              <VLabel class="text-body-4 text-high-emphasis">Количество этикеток</VLabel>
            </VCol>
            <VCol cols="6">
              <AppTextField
                type="number"
                v-model="labelCount"
                :error="labelError"
                :error-messages="labelError ? 'Введите число больше 0' : ''"
              />
            </VCol>
          </VRow>

          <VCol class="pa-4 mt-6" style="border-radius: 12px; border: 1px solid #e0e0e0;">
            <!-- Первый блок: выбор принтера -->
           <PrinterInfo :printer="printer" @printer-updated="emit('printer-updated', $event)"/>

            <!-- Второй блок: количество ЧЗ -->
            <VRow align="center" no-gutters>
              <VCol cols="auto">
                <VAvatar size="34" color="success" variant="tonal" class="me-2" rounded>
                  <VIcon icon="tabler-building-bank" size="22" />
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

      <VCardText class="d-flex justify-end flex-wrap gap-3">
        <VBtn variant="tonal" color="secondary" @click="close">Отменить</VBtn>
        <VBtn
          color="primary"
          :loading="loading"
          :disabled="loading"
          @click="downloadFile"
        >
          Скачать этикетку
        </VBtn>
      </VCardText>
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


<style lang="scss">
  .v-selection-control {
    align-items: flex-start;
  }

  .label-box {
    border-radius: 10px;
    color: #000;
    position: relative;
    width: 58mm;
    height: 40mm;
    padding: 8px;
    background: #fff;
    font-family: Arial, sans-serif;
    font-size: 9px;
    line-height: 1.3;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border: 2px solid rgb(156, 156, 156);
    transition: border-color 0.2s ease;
  }

  .label-box--selected {
    border-color: rgb(var(--v-theme-primary));
  }

  .label-header {
    text-align: center;
    margin-bottom: 4px;
  }

  .label-header-text {
    font-weight: bold;
    font-size: 11px;
  }

  .label-content {
    display: flex;
    align-items: stretch;
  }

  .label {
    display: flex;
    flex-direction: column;
  }

  .label.left {
    width: 50%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .label.right {
    width: 50%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .label.right .spacer {
    display: flex;
    flex: 1;
    align-items: center;
  }

  .label-size {
    font-size: 14px;
    font-weight: bold;
  }

  .label-barcode-block {
    margin-top: 5px;
    text-align: center;
  }
</style>
