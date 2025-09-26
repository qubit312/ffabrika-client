<script setup lang="ts">
import type { FilterRequest } from '@/types/filter';
import { computed, ref, watch } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import { replaceProductSize } from '../../services/chz';
import { getProductMainImage } from '../../services/productImages';
import { getProductsWithSizes } from '../../services/products';
import { getProductSizes } from '../../services/productSizes';
import type { WbProduct } from '../../types/product';
import type { ProductSizeWithLabels } from '../../types/productSize';

interface Props {
  modelValue: boolean
  product: WbProduct
}
const props = defineProps<Props>()
const emit  = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
const dialog = ref(props.modelValue)
const { onLabelsUpdated } = useLabelEvents()

const selectedSourceProduct = ref<WbProduct|null>(null)
const currentClientId = ref<number|null>(null)
const selectedTargetProduct = ref<number|null>(null)
const sourceProducts = ref<WbProduct[]>([])
const targetProducts = ref<WbProduct[]>([])
const labelCount              = ref<number>(1)
const selectedSourceSizeId    = ref<number|null>(null)
const selectedTargetSizeId    = ref<number|null>(null)

watch(() => props.modelValue, v => (dialog.value = v))
watch(dialog, v => emit('update:modelValue', v))


watch(selectedSourceProduct, async (product) => {
  const id = product?.id

  selectedSourceSizeId.value = null
  selectedTargetProduct.value = null
  sourceSizes.value = []
  if (id) {
    sourceProductImage.value = ''
    await fetchSizes(id, 'source')
    await fetchProductImage(id, 'source')

    const clientId = product?.client_id
    currentClientId.value = clientId || null
    if (clientId) {
      await fetchTargetProducts()
    } else {
      targetProducts.value = []
    }
  }
})

const searchQueryTP = ref<string>('')
const searchQuerySP = ref<string>('')
let debounceTimer: number | null = null

watch(searchQuerySP, (val) => {
  if (!val || val == '') {
    return
  }
  handleSourceProductChange()
})

watch(searchQueryTP, (val) => {
  if (!val || val == '') {
    return
  }
  handleTargetProductChange()
})

async function fetchTargetProducts() {
  const clientId = currentClientId.value
  const payload: FilterRequest = {
    filters: [],
    sort_by: 'name',
    sort_dir: 'asc',
  }

  if(clientId) {
    payload.filters?.push({ field: 'client_id', op: 'eq', value: clientId })
  }

  if(selectedSourceProduct.value?.id) {
    payload.filters?.push({ field: 'id', op: 'ne', value: selectedSourceProduct.value?.id })
  }

  if(selectedSourceProduct.value?.color) {
    payload.filters?.push({ field: 'color', op: 'eq', value: selectedSourceProduct.value?.color })
  }
  
  if (searchQueryTP.value) {
    payload.filters?.push({
      group: 'or',
      filters: [
        { field: 'name', op: 'like', value: searchQueryTP.value },
        { field: 'article', op: 'like', value: searchQueryTP.value },
        { field: 'vendor_code', op: 'like', value: searchQueryTP.value }
      ]
    })
  }

  // const { data, error } = await getProducts(clientId, selectedSourceProductId.value)
  const { data, error } = await getProductsWithSizes(payload)
  if (error.value) {
    console.error('Ошибка при загрузке целевых товаров:', error.value)
    return
  }

  targetProducts.value = data.value.data || []
}

watch(selectedTargetProduct, async (id) => {
  selectedTargetSizeId.value = null
  targetSizes.value = []
  if (id) {
    targetProductImage.value = ''
    await fetchSizes(id, 'target')
    await fetchProductImage(id, 'target')
  }
})

const availableSourceQuantity = computed(() => {
  const size = sourceSizes.value.find(s => s.id === selectedSourceSizeId.value)
  return size?.available_count ?? 0
})

const sourceSizes = ref<ProductSizeWithLabels[]>([])
const targetSizes = ref<ProductSizeWithLabels[]>([])

async function handleTargetProductChange() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(() => {
    fetchTargetProducts()
  }, 400)
}

async function handleSourceProductChange() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(() => {
    fetchProducts()
  }, 400)
}


async function fetchProducts() {
  const payload: FilterRequest = {
    filters: [],
    sort_by: 'name',
    sort_dir: 'asc',
  }
  
  if (!searchQuerySP.value) {
    return
  }
  
  payload.filters?.push({
      group: 'or',
      filters: [
        { field: 'name', op: 'like', value: searchQuerySP.value },
        { field: 'article', op: 'like', value: searchQuerySP.value },
        { field: 'vendor_code', op: 'like', value: searchQuerySP.value }
      ]
    })
  
  const { data, error } = await getProductsWithSizes(payload)
  
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  sourceProducts.value = data.value.data || []
}

const sourceProductImage = ref<string>('')
const targetProductImage = ref<string>('')

async function fetchProductImage(productId: number, productType: 'target' | 'source') {
  const { data, error } = await getProductMainImage(productId)
    if (!error.value && data.value?.data) {
      if (productType === 'source') {
        sourceProductImage.value = data.value.data.url
      } else if (productType === 'target'){
        targetProductImage.value = data.value.data.url
      }
    }
}

async function fetchSizes(productId: number, target: 'source' | 'target') {
  const { data, error } = await getProductSizes(productId)
  if (error.value) {
    console.error('Ошибка загрузки размеров:', error.value)
    return
  }
  const arr = data.value.data
  if (target === 'source') {
    sourceSizes.value = arr
  } else {
    targetSizes.value = arr
  }
}


async function onReplaceSize() {
  if (!selectedSourceSizeId.value || !selectedTargetSizeId.value || labelCount.value < 1) {
    console.error('Пожалуйста, выберите оба размера и укажите количество ≥ 1')
    return
  }

  if (selectedSourceSizeId.value === selectedTargetSizeId.value) {
    console.error('Размеры откуда и куда не должны совпадать')
    return
  }

  const dto = {
    old_size_id: Number(selectedSourceSizeId.value),
    new_size_id: Number(selectedTargetSizeId.value),
    quantity: Number(labelCount.value),
  }

  const { data, error } = await replaceProductSize(dto)
  if (error.value) {
    console.error(error.value)
    return
  }
  onLabelsUpdated()
  dialog.value = false
}
</script>

<template>
  <VDialog v-model="dialog" max-width="750">
    <VCard>
      <VCardTitle>Перенос этикеток</VCardTitle>
      <VCardText>
        <VRow dense align="start">
          <!-- Откуда -->
          <VCol class="d-flex flex-column">
            <div class="font-weight-medium mb-2">Откуда берём этикетки</div>
            <VLabel class="text-body-2 mb-1" style="color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))">Товар</VLabel>
            <VAutocomplete
              v-model="selectedSourceProduct"
              v-model:search="searchQuerySP"
              :items="sourceProducts"
              :no-filter="true"
              :item-value="p => p"
              item-title="name"
              :density="selectedSourceProduct ? 'compact' : 'comfortable'"
              :variant="selectedSourceProduct ? 'plain' : 'outlined'"  
              menu-icon=""
              :clearable="false"
              placeholder="Поиск по артикулу или названию"
              class="mb-6"
            >
              <template #selection="{ item }">
                <div class="mt-8 d-flex align-center" style="min-width: 0; overflow: hidden;">
                  <div class="mr-2 d-flex">
                    <img
                      style="border-radius: 5px; max-height: 60px;"
                      width="48"
                      :src="sourceProductImage"
                    />
                  </div>
                  <div class="d-flex flex-column" style="min-width: 0; overflow: hidden;">
                    <div
                      style="
                        font-size: 14px;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ item.title }}
                    </div>
                    
                    <div 
                      style="
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(0, 0, 0, 0.55);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      <span>{{ item.raw.color }}</span>
                    </div>
                  
                    <div
                      style="
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(0, 0, 0, 0.55);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      <span>{{ item.raw.article }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ item.raw.vendor_code }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template #no-data>
                <div class="pa-4 text-grey">
                  Начните вводить
                </div>
              </template>
            </VAutocomplete>

            <AppSelect
              v-model="selectedSourceSizeId"
              :items="sourceSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedSourceProduct"
              class="mt-4"
              label="Размер"
              outlined
            />
            <div class="mt-2">Доступно: {{ availableSourceQuantity }}</div>
          </VCol>

          <!-- Стрелка -->
          <VCol cols="auto"
            class="d-flex justify-center ma-2"
            align-self="center"
          >
            <VIcon size="36">tabler-arrow-right</VIcon>
          </VCol>

          <!-- Куда -->
          <VCol  class="d-flex flex-column">
            <div class="font-weight-medium mb-2">Куда переносим</div>
            <VLabel class="text-body-2 mb-1" style="color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))">Товар</VLabel>
            <VAutocomplete
              v-model="selectedTargetProduct"
              v-model:search="searchQueryTP"
              :items="targetProducts"
              :no-filter="true"
              item-title="name"
              item-value="id"
              :density="selectedTargetProduct ? 'compact' : 'comfortable'"
              :variant="selectedTargetProduct ? 'plain' : 'outlined'"
              placeholder="Поиск по артикулу или названию"
              menu-icon=""
              :clearable="false"
              class="mb-6"
            >
              <template #selection="{ item }">
                <div class="mt-8 d-flex align-center" style="min-width: 0; overflow: hidden;">
                  <div class="mr-2 d-flex">
                    <img 
                      style="border-radius: 5px; max-height: 60px;" 
                      width="48"
                      :src="targetProductImage"
                    />
                  </div>
                  <div class="d-flex flex-column" style="min-width: 0; overflow: hidden;">
                    <div 
                      style="
                        font-size: 14px;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ item.title }}
                    </div>

                    <div 
                      style="
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(0, 0, 0, 0.55);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      <span>{{ item.raw.color }}</span>
                    </div>
                    <div 
                      style="
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(0, 0, 0, 0.55);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      <span>{{ item.raw.article }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ item.raw.vendor_code }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template #no-data>
                <div class="pa-4 text-grey">
                  Начните вводить
                </div>
              </template>
            </VAutocomplete>
            <AppSelect
              v-model="selectedTargetSizeId"
              :items="targetSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedTargetProduct"
              label="Размер"
              class="mt-4"
              outlined
            />
            <AppTextField
              v-model="labelCount"
              type="number"
              label="Количество этикеток"
              min="1"
              outlined
              class="mt-4"
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end pa-6 pt-0">
        <VBtn @click="dialog = false">Отмена</VBtn>
        <VBtn color="primary" variant="flat" @click="onReplaceSize">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
