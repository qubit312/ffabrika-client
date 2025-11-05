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
  get: () => {
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

const manufacturer = computed({
  get: () => form.value.manufacturer,
  set: v => (form.value.manufacturer = v)
})

const manufactureDate = computed({
  get: () => {
    if (!form.value.manufacture_date) return null;
    
    const date = new Date(form.value.manufacture_date);
    return date.toISOString().split('T')[0];
  },
  set: v => {
    form.value.manufacture_date = v ? v : '';
  }
})

const country = computed({
  get: () => form.value.country,
  set: v => (form.value.country = v)
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
    number: 1,
    userId: 3,
    gtin: '0123456789012',
    serial: 'A1B2C3D4E5',
    shortAddress: 'г. Москва',
    manufactureDate: '01.01.2025',
    manufacturer: 'ООО Ткань',
    country: 'Россия',
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
              <div>
                <LabelPreview :schema="JSON.parse(tpl.content)" :data="previewData" />
                <div class="mt-1" style="text-align: center">{{tpl.name}}</div>
              </div>
            </template>
          </VRadio>
        </VRadioGroup>
      </VRow>
      <VRow>
        <VCol cols="12" class="pb-12">
          <VRow class="pb-6">
            <VCol cols="6" class="pb-1">
              <AppTextField
                label="Название для этикетки"
                placeholder="Введите название товара на этикетке"
                v-model="name"
              />
            </VCol>
            <VCol cols="6" class="pb-1">
              <AppSelect
                :items="productSizeTypes"
                v-model="productSizeType"
                item-title="displayValue"
                item-value="value"
                label="Используемый размер"
                placeholder="Выберите тип размера"
              />
            </VCol>

            <VCol cols="6" class="pa-0">
              <VCol cols="12" class="pb-1">
                <VLabel class="text-body-2" style="color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));">
                  Наименование продавца
                  <VTooltip location="top">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        class="ms-1"
                      >
                        <VIcon icon="tabler-help" size="20" />
                      </VBtn>
                    </template>
                    <span>Короткое название организации</span>
                  </VTooltip>
                </VLabel>
                <AppTextField
                  readonly
                  append-inner-icon="tabler-lock"
                  v-model="clientName"
                />
              </VCol>

              <VCol cols="12" class="mb-3">
                <AppTextField
                  label="Производитель"
                  v-model="manufacturer"
                />
              </VCol>

              <VRow class="ps-3 pe-3">
                <VCol cols="6" class="pt-1">
                  <AppTextField
                    label="Страна"
                    v-model="country"
                  />
                </VCol>

                <VCol cols="6" class="pt-1">
                  <AppTextField
                    type="date"
                    label="Дата производства"
                    v-model="manufactureDate"
                  />
                </VCol>
              </VRow>
            </VCol>
            
            <VCol cols="6" class="pa-0 pt-8 ps-4">
              <VCol cols="12" class="pt-0 pb-0">
                <VSwitch
                  v-if="selectedTemplate === 2 || selectedTemplate === 3 || selectedTemplate === 4"
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
                  v-if="selectedTemplate === 2 || selectedTemplate === 3 || selectedTemplate === 4"
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
                  v-if="selectedTemplate === 2 || selectedTemplate === 3 || selectedTemplate === 4"
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
</style>
