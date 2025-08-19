<script setup lang="ts">
import barcodeEAN13 from '@/assets/images/barcode/barcode-ean13.png'
import datamatrix from '@/assets/images/barcode/datamatrix.png'
import CzLogo from '@/assets/images/logos/cz-logo.png'
import { computed, defineEmits, defineProps, ref } from 'vue'
import { productSizeTypes } from '../../constants/productSizeTypes'
import type { NewLabelInterface } from '../../types/label'

interface Props {
  labelId: number
  variant?: any
  modelValue: NewLabelInterface
}

const props = defineProps<Props>()
const size = ref<string>("M")
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

const selectedTemplate = computed({
  get: () => form.value.label_template_id,
  set: v => (form.value.label_template_id = v)
})

const productSizeType = computed({
  get: () => form.value.size_display_type,
  set: v => (form.value.size_display_type = v),
})

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')
</script>

<template>
  <VCard title="Настройка печати">
    <VCardText>
      <VRow>
        <VRadioGroup inline v-model="selectedTemplate">
          <VRadio :value="1" class="mb-4" >
              <template #label>
                <div
                  class="label-box"
                  :class="{ 'label-box--selected': selectedTemplate === 1 }"
                >
                    <div class="label-header">
                    <span class="label-header-text">{{ name }}</span>
                    </div>
                    <div class="label-content">
                    <div class="label" style="width: 70%">
                        <div class="label-line">Артикул: {{ form.product?.article || ''}}</div>
                        <div class="label-line">Цвет: {{ form.product?.color || ''}}</div>
                    </div>

                    <div class="label" style="width: 30%">
                        <div class="label-size">{{ size }}</div>
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
          
          <VRadio :value="2" class="mb-4">
              <template #label>
                <div>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === 2 }"
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
                            <p style="margin-block-end: 0">{{ name }}</p>
                            <p style="margin-block-end: 0">{{ form.product?.color }}</p>
                            <p style="margin-block-end: 0">{{ size }}</p>
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
                label="Наименование продавца"
                v-model="clientName"
              />
            </VCol>
            <VCol cols="6">
              <AppSelect
                :items="productSizeTypes"
                v-model="productSizeType"
                item-title="displayValue"
                item-value="value"
                label="Используемый размер"
                placeholder="Выберите тип размера"
              />
            </VCol>

            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === 2"
                label="Печать 1 ШК"
                v-model="printSingleEAN"
              />
              <VSwitch
                v-if="selectedTemplate === 1"
                disabled
                label="Печать 1 ШК"
                :model-value="false"
              />
            </VCol>

            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === 2"
                label="Печать 2 ШК"
                v-model="printDoubleEAN"
              />
              <VSwitch
                v-if="selectedTemplate === 1"
                disabled
                label="Печать 2 ШК"
                :model-value="false"
              />
            </VCol>

            <VCol cols="12" class="pt-0 pb-0">
              <VSwitch
                v-if="selectedTemplate === 2"
                v-model="duplicateDM"
                label="Дублировать ЧЗ"
              />
              <VSwitch
                v-if="selectedTemplate === 1"
                disabled
                :model-value="false"
                label="Дублировать ЧЗ"
              />
            </VCol>
          </VRow>
        </VCol>
      </VRow>
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
