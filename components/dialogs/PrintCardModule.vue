<script setup lang="ts">
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png';
import datamatrix from '@/assets/images/barcode/datamatrix.png';
import CzLogo from '@/assets/images/logos/cz-logo.png';
import { computed, defineEmits, defineProps, onMounted, ref } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import { createPrinter, getPrinter, getPrinters, syncPrinterCount, updatePrinter } from '../../services/printers';
import type { ShortEntityParams } from '../../types/label';
import type { CreatePrinterDto, Printer } from '../../types/printer';

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
const selectedTemplate = ref<'1'|'2'|'3'>('1')
const duplicateDM = ref(false)
const selectedSHK = ref<null | 'include' | 'duplicate'>(null)

const labelCount = ref<number>(1)
const loadedLabelInPrinterCount = ref<number>(0)
const availableLabelsCount = computed(() => props.availableLabelsCount)
const loading = ref(false)
const labelError = computed(() => !labelCount.value || labelCount.value <= 0)

const isLowloadedLabelInPrinterCount = computed(() => {
  const warning_threshold = selectedPrinter.value?.warning_threshold
    if (warning_threshold) {
      console.log(loadedLabelInPrinterCount.value * (1 - warning_threshold))
      return loadedLabelInPrinterCount.value < loadedLabelInPrinterCount.value * (1 - warning_threshold)
    }
    return loadedLabelInPrinterCount.value < 0
  }
)

const isLowAvailableLabelsCount = computed(() => 
  availableLabelsCount.value <= 0
)

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
  if (!selectedPrinterId.value) { 
    showSnackbar("Выберете принтер", false)
    return
  }

  if (labelError.value || isLowAvailableLabelsCount.value) {
    let errorMessage = labelError.value
      ? 'Введите число больше 0'
      : `Недостаточно этикеток для печати`
    showSnackbar(errorMessage, false)
    return
  }

  loading.value = true
  if (labelCount.value == null || labelCount.value == 0) {
    console.error('Укажите количество этикеток')
    return
  }

  const payload = {
    printerId: selectedPrinterId.value,
    labelId: props.labelId,
    sizeId: props.sizeId,
    quantity: labelCount.value,
    includeDM: selectedTemplate.value === '1',
    includeSHK: selectedTemplate.value === '2'
      ? true
      : selectedSHK.value === 'include',
    duplicateSHK: selectedTemplate.value === '2'
      ? false
      : selectedSHK.value === 'duplicate',
    duplicateDM: selectedTemplate.value === '2'
      ? false
      : duplicateDM.value,
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

    const safeName = props.name.replace(/\s+/g, '_')
    const safeSize = props.size.replace(/\s+/g, '_')
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
  }
}

const dialog = ref(false)
const isEditMode = ref(false)
const editingId = ref<number | null>(null)
const clientBrand = ref<string>('')
const name = ref<string>('')
const clientName = ref<string>('')
const printers = ref<Printer[]>([])
const selectedPrinter = ref<Printer | null>(null)
const selectedPrinterId = ref<number | null>(null)

const form = ref<CreatePrinterDto>({
  name: '',
  labels_count: 0,
  capacity: 1,
  warning_threshold: 0,
})

async function fetchPrinters() {
  const { data, error } = await getPrinters()
  if (data.value) {
    printers.value = data.value.data
  } else {
    console.error('Ошибка при загрузке принтеров', error.value)
  }
}

async function openDialog(id?: number | null) {
  dialog.value = true
  if (id) {
    const { data, error } = await getPrinter(id);
    const printer = data.value;
    form.value = {
      name: printer.name,
      labels_count: printer.labels_count,
      capacity: printer.capacity,
      warning_threshold: printer.warning_threshold,
    }
    editingId.value = printer.id
    isEditMode.value = true
  } else {
    form.value = {
      name: '',
      labels_count: 0,
      capacity: 1,
      warning_threshold: 0,
    }
  }
}

async function submitPrinter() {
  const dto = { ...form.value }

  if (isEditMode.value && editingId.value) {
    const { data, error } = await updatePrinter(editingId.value, dto)
    if (data.value) {
      selectedPrinter.value = data.value.data     
      showSnackbar("Успешно сохранено", true)
    } else {
      console.error(error.value.data)
      const errorMessage = error?.value?.data?.message;
      showSnackbar(!errorMessage ? "Произошла ошибка при сохранении" : errorMessage, false)
      return
    }
  } else {
    const { data, error } = await createPrinter(dto)
    if (data.value) {
      showSnackbar("Успешно сохранено", true)
    } else {
      console.error(error.value.data)
      const errorMessage = error?.value?.data?.message;
      showSnackbar(!errorMessage ? "Произошла ошибка при сохранении" : errorMessage, false)
      return
    }
  }
  fetchPrinters()
  dialog.value = false
}

async function onPrinterSelect(id: number) {
  const { data, error } = await getPrinter(id);
  selectedPrinter.value = data.value
  loadedLabelInPrinterCount.value = data.value.labels_count
}

async function refreshPrinterCount() {
  if (!selectedPrinter.value || !selectedPrinterId.value) {
    showSnackbar("Сначала выберите принтер", false)
    return
  }

  try {
    const { data, error } = await syncPrinterCount(selectedPrinterId.value)
    
    if (data.value) {
      showSnackbar("Количество этикеток обновлено", true)
      loadedLabelInPrinterCount.value = data.value.labels_count
      await fetchPrinters()
    } else {
      console.error(error.value)
      showSnackbar("Ошибка при обновлении количества", false)
    }
  } catch (err) {
    console.error(err)
    showSnackbar("Ошибка при выполнении запроса", false)
  }
}


onMounted(fetchPrinters)
</script>

<template>
  <VCard title="Настройка печати">
    <VCardText>
      <VRow>
        <VRadioGroup inline v-model="selectedTemplate">
            <VRadio value="1" class="mb-4">
              <template #label>
                <div>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === '1' }"
                  >
                    <div class="label-content" style="margin-top: 5px">
                      <div class="label left" style="width: 50%">
                        <img
                          style="height: 21mm; width: 21mm;"
                          alt="Штрихкод"
                          :src="datamatrix"
                        />
                      </div>
                      <div class="label right">
                        <div style="text-align: center;">
                          <img
                            style="height: 5mm;"
                            alt="Штрихкод"
                            :src="CzLogo" />
                        </div>

                        <div class="spacer">
                          <div style="text-align: left;">
                            <p style="margin-block-end: 0">{{props.name}}</p>
                            <p style="margin-block-end: 0">{{ props.color }}</p>
                            <p style="margin-block-end: 0">{{props.size}}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style="text-align: right; margin-bottom: 5px">
                      <span style="font-size: 14px; font-weight: bold">10</span>
                    </div>

                    <div>
                      <span style="margin-right: 10px; font-size: 11px">01234567891011</span>
                      <span style="font-size: 11px">2NnIRDZfTGMDA</span>
                    </div>
                  </div>
                </div>
              </template>
            </VRadio>

            <VRadio value="2" class="mb-4" >
              <template #label>
                <div
                  class="label-box"
                  :class="{ 'label-box--selected': selectedTemplate === '2' }"
                >
                    <div class="label-header">
                    <span class="label-header-text">{{ props.name }}</span>
                    </div>
                    <div class="label-content">
                    <div class="label" style="width: 70%">
                        <div class="label-line">Артикул: {{ props.article }}</div>
                        <div class="label-line">Цвет: {{ props.color }}</div>
                    </div>

                    <div class="label" style="width: 30%">
                        <div class="label-size">{{ props.size }}</div>
                    </div>
                    </div>
                    <div class="label-content">
                    <div class="label">
                        <div class="label-line">{{ props.client?.name }}</div>
                        <div class="label-line">Состав: {{ props.composition || '' }}</div>
                    </div>                  
                    </div>
                    
                    <div class="label-barcode-block">
                    <img
                      style="height: 14mm;"
                      alt="Штрихкод"
                      :src="barcodeEAN13"
                    />
                    </div>
                </div>
              </template>
            </VRadio>

            <!-- <VRadio value="3" class="radio-card">
              <template #label>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === '3' }"
                  >
                      <div class="label-header">
                      <span class="label-header-text">{{ props.name }}</span>
                      </div>
                      <div class="label-content">
                      <div class="label left" style="width: 50%">
                          <img
                          style="height: 21mm; width: 21mm;"
                          alt="Штрихкод"
                          src="https://barcode.tec-it.com/barcode.ashx?data=01046605684903452152NnIRDZfTGMD%1D91EE11%1D92oeGgLmUSMbPtHc2xVZxqkcrYSXz6%2B2ADQ0H4ZUANOqw%3D&code=GS1DataMatrix&translate-esc=on&dmsize=Default" />
                      </div>
                      <div class="label right">
                          <div style="text-align: center;">
                          ЧЕСТНЫЙ ЗНАК
                          </div>

                          <div class="spacer">
                          <div style="text-align: center;">
                              {{props.name}}, цвет {{ props.color }}, размер {{props.size}}
                          </div>
                          </div>
                      </div>
                      </div>
                      <div style="text-align: right;">
                      <span style="font-size: 14px; font-weight: bold">1</span>
                      </div>
                      <div>
                      <span style="margin-right: 10px; font-size: 10px">01234567891011</span>
                      <span style="font-size: 10px">2NnIRDZfTGMDA</span>
                      </div>
                  </div>
              </template>
            </VRadio> -->       
          </VRadioGroup>
      </VRow>
      
      <VRow>
        <VCol cols="12">
          <VRow class="pb-6">
            <VCol cols="6">
              <AppTextField
                label="Название для этикетки"
                placeholder="Введите название товара на этикетке"
                v-model="name"
              />
            </VCol>
            <VCol cols="6">
              <AppTextField
                label="Бренд"
                v-model="clientBrand"
              />
            </VCol>
            <VCol cols="6">
              <AppTextField
                label="Наименование продавца"
                v-model="clientName"
              />
            </VCol>
            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === '1'"
                label="Печать 1 ШК"
                :model-value="selectedSHK === 'include'"
                @update:modelValue="val => selectedSHK = val ? 'include' : (selectedSHK === 'include' ? null : selectedSHK)"
              />
              <VSwitch
                v-if="selectedTemplate === '2'"
                disabled
                label="Печать 1 ШК"
                :model-value="false"
                @update:modelValue="val => selectedSHK = val ? 'include' : (selectedSHK === 'include' ? null : selectedSHK)"
              />
            </VCol>
            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === '1'"
                label="Печать 2 ШК"
                :model-value="selectedSHK === 'duplicate'"
                @update:modelValue="val => selectedSHK = val ? 'duplicate' : (selectedSHK === 'duplicate' ? null : selectedSHK)"
              />
              <VSwitch
                v-if="selectedTemplate === '2'"
                disabled
                label="Печать 2 ШК"
                :model-value="false"
                @update:modelValue="val => selectedSHK = val ? 'duplicate' : (selectedSHK === 'duplicate' ? null : selectedSHK)"
              />
            </VCol>
            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === '1'"
                v-model="duplicateDM"
                label="Дублировать ЧЗ"
              />
              <VSwitch
                v-if="selectedTemplate === '2'"
                disabled
                :model-value="false"
                label="Дублировать ЧЗ"
              />
            </VCol>  
          </VRow>
        </VCol>
      </VRow>
    </VCardText>

    <VCardText>
      <VBtn
        color="primary"
        :loading="loading"
        :disabled="loading"
        @click="downloadFile"
      >
        Скачать документ
      </VBtn>
    </VCardText>
  </VCard>
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

  <VDialog v-model="dialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ isEditMode ? 'Редактировать принтер' : 'Создать принтер' }}
      </VCardTitle>

      <VCardText class="d-flex flex-column gap-3">
        <AppTextField
          v-model="form.name"
          label="Название принтера"
          required
        />
        
        <AppTextField
          v-model.number="form.capacity"
          label="Вместимость"
          type="number"
          min="1"
        />

        <AppTextField
          v-model.number="form.warning_threshold"
          label="Порог предупреждения"
          type="number"
          min="0"
        />
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn text @click="dialog = false">Отмена</VBtn>
        <VBtn color="primary" @click="submitPrinter">
          {{ isEditMode ? 'Сохранить' : 'Создать' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
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
