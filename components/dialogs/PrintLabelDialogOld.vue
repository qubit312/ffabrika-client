<script setup lang="ts">
import { computed, defineEmits, defineProps, ref } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import type { ShortEntityParams } from '../../types/label';

const config = useRuntimeConfig()
interface Props {
  sizeId: number
  labelId: number
  visible: boolean
  name: string
  article: string
  composition: string
  color: string
  size: string
  client: ShortEntityParams | null
  variant?: any
  availableLabelsCount: number
}
const props = defineProps<Props>()
const { onLabelsUpdated } = useLabelEvents()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const snackbar     = ref(false)
const snackMessage = ref('')
const snackColor   = ref<'success'|'error'>('success')

const includeSHK  = ref(false)
const duplicateDM = ref(false)

const labelCount = ref<number>()
const loadedLabelInPrinterCount = ref<number>(5)
const availableLabelsCount = computed(() => props.availableLabelsCount)
const loading = ref(false)
const labelError = computed(() => !labelCount.value || labelCount.value <= 0)

const isLowloadedLabelInPrinterCount= computed(() => 
  loadedLabelInPrinterCount.value < 10
)
const isLowAvailableLabelsCount = computed(() => 
  availableLabelsCount.value < 10
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
  if (labelError.value || isLowAvailableLabelsCount.value) {
    let errorMessage = labelError.value
      ? 'Введите число больше 0'
      : `Недостаточно этикеток для печати`
    showSnackbar(errorMessage, false)
    return
  }

  loading.value = true
  if (labelCount.value == null || labelCount.value == 0) {
    console.error('labelCount is null or empty')
    return
  }

  const payload = {
    labelId: props.labelId,
    sizeId: props.sizeId,
    quantity: labelCount.value,
    includeDM: false,
    includeSHK: false,
    duplicateDM: false,
  }

  if (selectedTemplate.value === '2') {
    payload.includeSHK = true;
  } else {
    payload.includeDM = true;
    payload.includeSHK = includeSHK.value;
    payload.duplicateDM = duplicateDM.value;
  }

  const token = localStorage.getItem('access_token') || ''
  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBaseUrl;

    const response = await fetch(baseURL + `/api/chestny-znak-labels/download-pdf`, {
      method: 'POST',
      headers: {
        'Accept': 'application/pdf',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Сервер вернул ${response.status}`)
    }

    const blob = await response.blob()
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const date = new Date().toISOString().slice(0,10)
    const safeName = props.name.replace(/\s+/g,'_')
    const safeSize = props.size.replace(/\s+/g,'_')
    link.download = `${safeName}_${safeSize}_${date}.pdf`

    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

  } catch (err: any) {
    console.error('Ошибка при скачивании PDF:', err)
  } finally {
    onLabelsUpdated()
    loading.value = false
    close()
  }
}

const selectedTemplate = ref<'1'|'2'|'3'>('1')
</script>

<template>
  <VDialog
    v-model="props.visible"
    max-width="900"
  >
    <DialogCloseBtn @click="close" />
    <VCard title="Форма печати">
      <VCardText>
        <VRow>
        <VCol cols="6">
          <VCol cols="6">
            <AppTextField
              label="Количество"
              type="number"
              v-model="labelCount"
              :error="labelError"
              :error-messages="labelError ? 'Введите число больше 0' : ''"
            />
          </VCol>
          <VCol cols="12">
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Количество этикеток в принтере
            </VLabel>

            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }">
                  <VIcon
                    v-if="isLowloadedLabelInPrinterCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Мало этикеток в принтере</span>
              </VTooltip>

              <AppTextField
                :model-value="loadedLabelInPrinterCount"
                readonly
                :error="isLowloadedLabelInPrinterCount"
                :class="{
                  'text-error': isLowloadedLabelInPrinterCount
                }"
              />
            </div>
          </VCol>
          <VCol
            cols="12"
          >
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Доступно честных знаков
            </VLabel>
            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }"> 
                  <VIcon
                    v-if="isLowAvailableLabelsCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Осталось мало Честных Знаков для печати</span>
              </VTooltip>
                
              <AppTextField
                :model-value="availableLabelsCount"
                readonly
                :error="isLowAvailableLabelsCount"
                :class="{
                  'text-high-emphasis': !isLowAvailableLabelsCount,
                  'text-error': isLowAvailableLabelsCount
                }"
              />
            </div>
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="duplicateDM"
              label="Дублировать ЧЗ"
            />
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="includeSHK"
              label="Печать ШК EAN-13"
            />
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="includeSHK"
              label="Дублировать ШК"
            />
          </VCol>
        </VCol>
        <VCol cols="6">
          <VCol>
            <AppTextField
              label="Количество"
              type="number"
              v-model="labelCount"
              :error="labelError"
              :error-messages="labelError ? 'Введите число больше 0' : ''"
            />
          </VCol>
          <VCol cols="12">
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Количество этикеток в принтере
            </VLabel>

            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }">
                  <VIcon
                    v-if="isLowloadedLabelInPrinterCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Мало этикеток в принтере</span>
              </VTooltip>

              <AppTextField
                :model-value="loadedLabelInPrinterCount"
                readonly
                :error="isLowloadedLabelInPrinterCount"
                :class="{
                  'text-error': isLowloadedLabelInPrinterCount
                }"
              />
            </div>
          </VCol>
          <VCol
            cols="12"
          >
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Доступно честных знаков
            </VLabel>
            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }"> 
                  <VIcon
                    v-if="isLowAvailableLabelsCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Осталось мало Честных Знаков для печати</span>
              </VTooltip>
                
              <AppTextField
                :model-value="availableLabelsCount"
                readonly
                :error="isLowAvailableLabelsCount"
                :class="{
                  'text-high-emphasis': !isLowAvailableLabelsCount,
                  'text-error': isLowAvailableLabelsCount
                }"
              />
            </div>
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="duplicateDM"
              label="Дублировать ЧЗ"
            />
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="includeSHK"
              label="Печать ШК EAN-13"
            />
          </VCol>
          <VCol cols="12">
            <VSwitch
              v-model="includeSHK"
              label="Дублировать ШК"
            />
          </VCol>
        </VCol>
        </VRow>
      </VCardText>

      <VCardText class="d-flex justify-end flex-wrap gap-3">
        <VBtn variant="tonal" color="secondary" @click="close">Отменить</VBtn>
        <VBtn
          color="primary"
          @click="downloadFile"
        >
          Скачать документ
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
    font-size: 18px;
    font-weight: bold;
  }

  .label-barcode-block {
    margin-top: 5px;
    text-align: center;
  }
</style>
