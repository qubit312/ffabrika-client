<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, ref } from 'vue'
import { productSizeTypes } from '../../constants/productSizeTypes'
import { getLabelTemplates } from '../../services/labelTemplates'
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
  get: () => {console.log(props.modelValue)
    return props.modelValue
  },
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

const templates = ref<any[]>([])
const loadingTemplates = ref(false)

const previewData = computed(() => {
  return {
    name: form.value.name,
    brand: 'BRAND',
    client: form.value.client_name,
    size: size.value,
    article: form.value.product?.article,
    color: form.value.product?.color,
    composition: form.value.product?.composition,
    barcode: form.value.product?.article,
    print_single_ean13: form.value.print_single_ean13,
    print_double_ean13: form.value.print_double_ean13,
    duplicate_chz: form.value.duplicate_chz,
  }
})

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const { data, error } = await getLabelTemplates()
    if (error.value) throw error.value

    templates.value = data.value?.data || []
  } catch (e: any) {
    snackMessage.value = 'Ошибка загрузки шаблонов'
    snackColor.value = 'error'
    snackbar.value = true
    console.error(e)
  } finally {
    loadingTemplates.value = false
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <VCard title="Настройка печати">
    <VCardText>
      <VRow>
        <VRadioGroup inline v-model="selectedTemplate">
          <VRadio
            v-for="tpl in templates"
            :key="tpl.id"
            :value="tpl.id"
            class="mb-4"
          >
            <template #label>
              <LabelPreview :schema="JSON.parse(tpl.content)" :data="previewData" />
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
