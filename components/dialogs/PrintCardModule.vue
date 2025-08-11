<script setup lang="ts">
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png'
import datamatrix from '@/assets/images/barcode/datamatrix.png'
import CzLogo from '@/assets/images/logos/cz-logo.png'
import { computed, defineEmits, defineProps, ref } from 'vue'
import { useLabelEvents } from '../../composables/useLabelBus'
import type { NewLabelInterface } from '../../types/label'

interface Props {
  sizeId: number
  labelId: number
  name: string
  size: string
  variant?: any
  modelValue: NewLabelInterface
}
const props = defineProps<Props>()

const { onLabelsUpdated } = useLabelEvents()
const emit = defineEmits<{
  (e: 'update:modelValue', v: NewLabelInterface): void
}>()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const name = computed({
  get: () => form.value.name,
  set: v => (form.value.name = v)
})

// const clientBrand = ref('')

const clientName = computed({
  get: () => form.value.client_name,
  set: v => (form.value.client_name = v)
})

const printSingleEAN = computed({
  get: () => form.value.print_single_ean13,
  set: v => {
    form.value.print_single_ean13 = v
    if (v) form.value.print_double_ean13 = false
  }
})

const printDoubleEAN = computed({
  get: () => form.value.print_double_ean13,
  set: v => {
    form.value.print_double_ean13 = v
    if (v) form.value.print_single_ean13 = false
  }
})

const duplicateDM = computed({
  get: () => form.value.duplicate_chz,
  set: v => (form.value.duplicate_chz = v)
})

const selectedPrinterId = computed({
  get: () => form.value.printer_id,
  set: v => (form.value.printer_id = v)
})


const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')
const selectedTemplate = ref<'1' | '2' | '3'>('1')
const selectedSHK = ref<null | 'include' | 'duplicate'>(null)

const labelCount = ref<number>(1)
const availableLabelsCount = computed(() => 9999)
const loading = ref(false)
const labelError = computed(() => !labelCount.value || labelCount.value <= 0)

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.value = true
  snackMessage.value = message
  snackColor.value = isSuccess ? 'success' : 'error'
}

async function downloadFile() {
  if (!selectedPrinterId.value) {
    showSnackbar('Выберете принтер', false)
    return
  }

  if (labelError.value || 9999) {
    let errorMessage = labelError.value
      ? 'Введите число больше 0'
      : `Недостаточно этикеток для печати`
    showSnackbar(errorMessage, false)
    return
  }

  loading.value = true
  if (!labelCount.value) {
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
      : duplicateDM.value
  }

  const token = localStorage.getItem('access_token') || ''
  try {
    const config = useRuntimeConfig()
    const baseURL = config.public.apiBaseUrl

    const response = await fetch(
      baseURL + `/api/chestny-znak-labels/download-pdf`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    )

    const contentType = response.headers.get('Content-Type')
    if (!response.ok) {
      if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        showSnackbar(
          errorData.message || 'Произошла ошибка при генерации PDF',
          false
        )
        throw new Error(errorData.message || 'Неизвестная ошибка')
      } else {
        throw new Error(`Сервер вернул ${response.status}`)
      }
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const ms = now.getMilliseconds().toString().padStart(3, '0')

    const dateStr = `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(
      now.getMinutes()
    )}-${pad(now.getSeconds())}-${ms}`

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
                            <p style="margin-block-end: 0">{{ form.product?.color }}</p>
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
                        <div class="label-line">Артикул: {{ form.product?.article || ''}}</div>
                        <div class="label-line">Цвет: {{ form.product?.color || ''}}</div>
                    </div>

                    <div class="label" style="width: 30%">
                        <div class="label-size">{{ props.size }}</div>
                    </div>
                    </div>
                    <div class="label-content">
                    <div class="label">
                        <div class="label-line">{{ "Название клиента" }}</div>
                        <div class="label-line">Состав: {{ form.product?.composition || '' }}</div>
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
            <!-- <VCol cols="6">
              <AppTextField
                label="Бренд"
                v-model="clientBrand"
              />
            </VCol> -->
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
                v-model="printSingleEAN"
              />
              <!-- <VSwitch
                v-if="selectedTemplate === '1'"
                label="Печать 1 ШК"
                :model-value="selectedSHK === 'include'"
                @update:modelValue="val => selectedSHK = val ? 'include' : (selectedSHK === 'include' ? null : selectedSHK)"
              /> -->
              <VSwitch
                v-if="selectedTemplate === '2'"
                disabled
                label="Печать 1 ШК"
                :model-value="false"
              />
            </VCol>

            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === '1'"
                label="Печать 2 ШК"
                v-model="printDoubleEAN"
              />
              <!-- <VSwitch
                v-if="selectedTemplate === '1'"
                label="Печать 2 ШК"
                :model-value="selectedSHK === 'duplicate'"
                @update:modelValue="val => selectedSHK = val ? 'duplicate' : (selectedSHK === 'duplicate' ? null : selectedSHK)"
              /> -->
              <VSwitch
                v-if="selectedTemplate === '2'"
                disabled
                label="Печать 2 ШК"
                :model-value="false"
              />
            </VCol>

            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === '1'"
                v-model="form.duplicate_chz"
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
