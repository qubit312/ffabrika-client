<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { ShortEntityParams } from '../../types/marking';
const token      = localStorage.getItem('access_token') || ''
const apiHeaders = token ? { Authorization: `Bearer ${token}` } : {}

interface Props {
  modelValue: boolean
  productId: number
}
const props = defineProps<Props>()
const emit  = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
const dialog = ref(props.modelValue)

interface ProductSize {
  id: number
  product_id: number
  value: string
  barcode: string
  available_labels_count: number
}

interface ReplaceSizeResponse {
  message: string;
  updated_count: number;
}

interface PaginatedResponse<T> {
  data: T[]
}

const savedProducts = ref<ShortEntityParams[]>([])
const labelCount        = ref<number>(1)
const selectedSourceProductId = ref<number|null>(null)
const selectedSourceSizeId    = ref<number|null>(null)
const selectedTargetProductId = ref<number|null>(null)
const selectedTargetSizeId    = ref<number|null>(null)

watch(() => props.modelValue, v => (dialog.value = v))
watch(dialog, v => emit('update:modelValue', v))

watch(selectedSourceProductId, id => {
  selectedSourceSizeId.value = null
  sourceSizes.value = []
  if (id != null) fetchSizes(id, 'source')
})
watch(selectedTargetProductId, id => {
  selectedTargetSizeId.value = null
  targetSizes.value = []
  if (id != null) fetchSizes(id, 'target')
})
const availableSourceQuantity = computed(() => {
  const size = sourceSizes.value.find(s => s.id === selectedSourceSizeId.value)
  console.log(size?.available_labels_count ?? 0)
  return size?.available_labels_count ?? 0
})

const sourceSizes = ref<ProductSize[]>([])
const targetSizes = ref<ProductSize[]>([])

async function fetchProducts() {
  const { data, error } = await useApi<ShortEntityParams[]>(
    '/api/products',
    {
      method:  'GET',
      headers: apiHeaders,
    }
  )
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  savedProducts.value = data.value || []
}


async function fetchSizes(productId: number, target: 'source' | 'target') {
  const { data, error } = await useApi<PaginatedResponse<ProductSize>>(
    '/api/product-sizes',
    {
      method: 'GET',
      params: { product_id: productId },
      headers: apiHeaders
    }
  )
  if (error.value) {
    console.error('Ошибка загрузки размеров:', error.value)
    return
  }
  const arr = data.value.data
  if (target === 'source') {
    sourceSizes.value = arr
    console.log(sourceSizes.value);
  } else {
    targetSizes.value = arr
  }
}

async function onReplaceSize() {
  if (!selectedSourceSizeId.value || !selectedTargetSizeId.value || labelCount.value < 1) {
    console.log('Пожалуйста, выберите оба размера и укажите количество ≥ 1')
    return
  }

  const dto = {
    old_size_id: Number(selectedSourceSizeId.value),
    new_size_id: Number(selectedTargetSizeId.value),
    quantity:   Number(labelCount.value),
  }

  const { data, error } = await useApi<ReplaceSizeResponse>(
    '/api/chestny-znak-labels/replace-size', {
      method:  'POST',
      body:    dto,
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders,
      }
    }
  )
  console.log(data.value)
  if (error.value) {
    console.error(error.value)
    return
  }
  dialog.value = false
}

onMounted(fetchProducts)
</script>
<template>
  <VDialog v-model="dialog" max-width="600">
    <VCard>
      <VCardTitle>Перенос наклеек</VCardTitle>
      <VCardText>
        <VRow dense align="start">
          <!-- Откуда -->
          <VCol cols="5" class="d-flex flex-column">
            <div class="font-weight-medium mb-2">Откуда берём наклейки</div>
            <AppSelect
              v-model="selectedSourceProductId"
              :items="savedProducts"
              item-title="name"
              item-value="id"
              label="Товар"
              outlined
            />
            <AppSelect
              v-model="selectedSourceSizeId"
              :items="sourceSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedSourceProductId"
              label="Размер"
              outlined
            />
            <div class="mt-2">Доступно: {{ availableSourceQuantity }}</div>
          </VCol>

          <!-- Стрелка -->
          <VCol cols="2"
            class="d-flex justify-center"
            align-self="center"
          >
            <VIcon size="36">tabler-arrow-right</VIcon>
          </VCol>

          <!-- Куда -->
          <VCol cols="5" class="d-flex flex-column">
            <div class="font-weight-medium mb-2">Куда переносим</div>
            <AppSelect
              v-model="selectedTargetProductId"
              :items="savedProducts"
              item-title="name"
              item-value="id"
              label="Товар"
              outlined
            />
            <AppSelect
              v-model="selectedTargetSizeId"
              :items="targetSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedTargetProductId"
              label="Размер"
              outlined
            />
            <AppTextField
              v-model="labelCount"
              type="number"
              label="Количество наклеек"
              min="1"
              outlined
              class="mt-4"
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end">
        <VBtn @click="dialog = false">Отмена</VBtn>
        <VBtn color="primary" @click="onReplaceSize">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
