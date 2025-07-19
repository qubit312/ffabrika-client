<script setup lang="ts">
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png';
import datamatrix from '@/assets/images/barcode/datamatrix.png';
import CzLogo from '@/assets/images/logos/cz-logo.png';
import { computed, defineEmits, defineProps, ref } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import type { ShortEntityParams } from '../../types/label';

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
const duplicateSHK = ref(false)

const labelCount = ref<number>(1)
const loadedLabelInPrinterCount = ref<number>(5)
const availableLabelsCount = computed(() => props.availableLabelsCount)
const loading = ref(false)
const labelError = computed(() => !labelCount.value || labelCount.value <= 0)

const isLowloadedLabelInPrinterCount= computed(() => 
  loadedLabelInPrinterCount.value < 10
)
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
    max-width="850"
  >
    <DialogCloseBtn @click="close" />
    <VCard title="Форма печати">
      <VCardText>
        <VRow>
          <VCol cols="5">
            <VRadioGroup v-model="selectedTemplate" class="mt-8">
              <VRadio value="1" class="radio-card mb-4">
                <template #label>
                  <div>
                    <div
                      class="label-box"
                      :class="{ 'label-box--selected': selectedTemplate === '1' }"
                    >
                    <span style="font-size: 9px;">13</span>
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
                              <p style="margin-block-end: 0">Цвет: {{ props.color }}</p>
                              <p style="margin-block-end: 0">Размер: {{props.size}}</p>
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

              <VRadio value="2" class="radio-card mb-4" >
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
          </VCol>

          <VCol cols="7">
            <VRow>
              <VCol cols="6">
                <VLabel class="mb-1 text-body-2 text-high-emphasis">Количество</VLabel>
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
            
            <VRow>
              <VCol cols="6">
                <span class="mb-1 text-body-2 text-high-emphasis">Количество этикеток в принтере</span>
              </VCol>
              <VCol cols="6">
                <AppTextField
                  :model-value="loadedLabelInPrinterCount"
                  readonly
                  :error="isLowloadedLabelInPrinterCount"
                  :error-messages="isLowloadedLabelInPrinterCount ? ['Мало этикеток в принтере'] : []"
                />
              </VCol>
            </VRow>

            <VRow>
              <VCol cols="6">
                <span class="mb-1 text-body-2 text-high-emphasis">Доступно честных знаков</span>
              </VCol>
              <VCol cols="6">
                <AppTextField
                  :model-value="availableLabelsCount"
                  readonly
                  :error="isLowAvailableLabelsCount"
                  :error-messages="isLowAvailableLabelsCount ? ['Недостаточно ЧЗ'] : []"
                />
              </VCol>
            </VRow>
            
            <VRow>
              <VCol cols="6">
                <VSwitch
                  v-if="selectedTemplate === '1'"
                  v-model="includeSHK"
                  label="Печать ШК EAN-13"
                />
              </VCol>
              <VCol cols="6">
                <VSwitch
                  v-if="selectedTemplate === '1'"
                  v-model="duplicateDM"
                  label="Дублировать ЧЗ"
                />
              </VCol>
            </VRow>

            <VCol class="ps-0" cols="12">
              <VSwitch
                v-if="includeSHK && selectedTemplate === '1'"
                v-model="duplicateSHK"
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
          :loading="loading"
          :disabled="loading"
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
    font-size: 14px;
    font-weight: bold;
  }

  .label-barcode-block {
    margin-top: 5px;
    text-align: center;
  }
</style>
