<script setup lang="ts">
import type { ShortEntityParams } from '@db/apps/marking/types'
import { defineEmits, defineProps, ref } from 'vue'

interface Props {
  visible: boolean
  name: string
  article: string
  composition: string
  color: string
  size: string
  client: ShortEntityParams | null
  variant?: any
  printableLabelCount: number
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const labelCount = ref<number>()
const loadedLabelCount = ref<number>(5)
const printableLabelCount = ref<number>(props.printableLabelCount)
const isLowLoadedLabelCount = computed(() => 
  (loadedLabelCount.value ?? 0) < 10
)
const isLowPrintableLabelCount = computed(() => 
  printableLabelCount.value < 10
)

function close() {
  emit('update:visible', false)
}

function downloadFile() {
  const config = {
    labelCount: labelCount.value,
    variant: props.variant ?? null,
    name: props.name,
    article: props.article,
    composition: props.composition,
    color: props.color,
    size: props.size,
    client: props.client,
  }
  console.log('Print config:', config)
  close()
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
          <VCol
            cols="12"
            sm="4"
          >
            <AppTextField
              v-model="labelCount"
              label="Количество"
              type="number"
              placeholder="Ввведите количество этикеток"
            />
          </VCol>
          <VCol
            cols="12"
            sm="4"
          >
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Количество этикеток в принтере
            </VLabel>
            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }"> 
                  <VIcon
                    v-if="isLowLoadedLabelCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Мало этикеток в принтер</span>
              </VTooltip>

                <span
                    class="pa-2 text-body-1"
                    :class="{
                    'text-high-emphasis': !isLowLoadedLabelCount,
                    'text-error': isLowLoadedLabelCount
                    }"
                >
                    {{ loadedLabelCount }}
                </span>
            </div>
          </VCol>
          <VCol
            cols="12"
            sm="4"
          >
            <VLabel class="mb-1 text-body-2 text-high-emphasis" style="line-height: 15px;">
              Доступно честных знаков
            </VLabel>
            <div class="d-flex align-center mb-1">
              <VTooltip bottom>
                <template #activator="{ props }"> 
                  <VIcon
                    v-if="isLowPrintableLabelCount"
                    v-bind="props"
                    icon="tabler-alert-circle"
                    class="mr-1 text-error"
                  />
                </template>
                <span>Осталось мало Честных Знаков для печати</span>
              </VTooltip>

                <span
                    class="pa-2 text-body-1"
                    :class="{
                    'text-high-emphasis': !isLowPrintableLabelCount,
                    'text-error': isLowPrintableLabelCount
                    }"
                >
                    {{ printableLabelCount }}
                </span>
            </div>
          </VCol>
        </VRow>
        
          <VRadioGroup v-model="selectedTemplate" class="mt-8">
            <div class="d-flex flex-row flex-nowrap gap-4">
            <VRadio value="1" class="radio-card" >
              <template #label>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === '1' }"
                  >
                      <div class="label-header">
                      <span class="label-header-text">{{ name }}</span>
                      </div>
                      <div class="label-content">
                      <div class="label" style="width: 80%">
                          <div class="label-line">Артикул: {{ article }}</div>
                          <div class="label-line">Цвет: {{ color }}</div>
                      </div>

                      <div class="label" style="width: 20%">
                          <div class="label-size">{{ size }}</div>
                      </div>
                      </div>
                      <div class="label-content">
                      <div class="label">
                          <div class="label-line">{{ client?.name }}</div>
                          <div class="label-line">Состав: {{ composition || '' }}</div>
                      </div>                  
                      </div>
                      
                      <div class="label-barcode-block">
                      <img
                          style="height: 15mm;"
                          alt="Штрихкод"
                          src="https://barcode.tec-it.com/barcode.ashx?data=123123123123&code=EAN13" />
                      </div>
                  </div>
              </template>
            </VRadio>

            <VRadio value="2" class="radio-card">
              <template #label>
                <div>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === '2' }"
                  >
                      <div class="label-header">
                      <span class="label-header-text">{{ name }}</span>
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
                              {{name}}, цвет {{ color }}, размер {{size}}
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
                </div>
              </template>
            </VRadio>
            
            <VRadio value="3" class="radio-card">
              <template #label>
                  <div
                    class="label-box"
                    :class="{ 'label-box--selected': selectedTemplate === '3' }"
                  >
                      <div class="label-header">
                      <span class="label-header-text">{{ name }}</span>
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
                              {{name}}, цвет {{ color }}, размер {{size}}
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
            </VRadio>
            </div>          
          </VRadioGroup>
      </VCardText>

      <VCardText class="d-flex justify-end flex-wrap gap-3">
        <VBtn variant="tonal" color="secondary" @click="close">Отменить</VBtn>
        <VBtn color="primary" @click="downloadFile">Скачать документ</VBtn>
      </VCardText>
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
    font-size: 18px;
    font-weight: bold;
  }

  .label-barcode-block {
    margin-top: 5px;
    text-align: center;
  }
</style>
