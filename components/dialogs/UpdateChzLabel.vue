<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import { replaceProductSize } from '../../services/chz';
import { getProducts } from '../../services/products';
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

const sourceProducts = ref<WbProduct[]>([])
const targetProducts = ref<WbProduct[]>([])
const labelCount              = ref<number>(1)
const selectedSourceProductId = ref<number>()
const selectedSourceSizeId    = ref<number|null>(null)
const selectedTargetProductId = ref<number|null>(null)
const selectedTargetSizeId    = ref<number|null>(null)

watch(() => props.modelValue, v => (dialog.value = v))
watch(dialog, v => emit('update:modelValue', v))

watch(selectedSourceProductId, async (id) => {
  selectedSourceSizeId.value = null
  selectedTargetProductId.value = null
  sourceSizes.value = []

  if (id != null) {
    await fetchSizes(id, 'source')

    const product = sourceProducts.value.find(p => p.id === id)
    const clientId = product?.client_id

    if (clientId) {
      await fetchTargetProducts(clientId)
    } else {
      targetProducts.value = []
    }
  }
})

async function fetchTargetProducts(clientId: number) {
  const { data, error } = await getProducts(clientId, selectedSourceProductId.value)
  if (error.value) {
    console.error('Ошибка при загрузке целевых товаров:', error.value)
    return
  }

  targetProducts.value = data.value || []
}

watch(selectedTargetProductId, id => {
  selectedTargetSizeId.value = null
  targetSizes.value = []
  if (id != null) fetchSizes(id, 'target')
})
const availableSourceQuantity = computed(() => {
  const size = sourceSizes.value.find(s => s.id === selectedSourceSizeId.value)
  return size?.available_labels_count ?? 0
})

const sourceSizes = ref<ProductSizeWithLabels[]>([])
const targetSizes = ref<ProductSizeWithLabels[]>([])

async function fetchProducts() {
  const { data, error } = await getProducts()
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  sourceProducts.value = data.value || []
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

onMounted(fetchProducts)
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
              v-model="selectedSourceProductId"
              :items="sourceProducts"
              item-title="name"
              item-value="id"
              :density="selectedSourceProductId ? 'compact' : 'comfortable'"
              :variant="selectedSourceProductId ? 'plain' : 'outlined'"  
              :menu-icon="null"
              :clearable="false"
              placeholder="Поиск по артикулу WB или названию"
              class="mb-6"
            >
              <template #selection="{ item }">
                <template v-if="item && item.raw">
                  <div class="mt-4 d-flex align-center" style="min-width: 0; overflow: hidden;">
                    <div class="mr-2 d-flex">
                      <img
                        style="border-radius: 5px; max-height: 48px;"
                        width="36"
                        src="https://placehold.co/36x48"
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
                        <span>{{ item.raw.article }}</span>
                        <span class="mx-1">•</span>
                        <span>{{ 'long-sliv-black' }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </VAutocomplete>

            <AppSelect
              v-model="selectedSourceSizeId"
              :items="sourceSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedSourceProductId"
              class="mt-2"
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
              v-model="selectedTargetProductId"
              :items="targetProducts"
              item-title="name"
              item-value="id"
              :density="selectedTargetProductId ? 'compact' : 'comfortable'"
              :variant="selectedTargetProductId ? 'plain' : 'outlined'"
              placeholder="Поиск по артикулу WB или названию"
              :menu-icon="null"
              :clearable="false"
              class="mb-6"
            >
              <template #selection="{ item }">
                <div class="mt-4 d-flex align-center" style="min-width: 0; overflow: hidden;">
                  <div class="mr-2 d-flex">
                    <img 
                      style="border-radius: 5px; max-height: 48px;" 
                      width="36"
                      src="https://placehold.co/36x48"
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
                      <span>{{ item.raw.article }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ 'long-sliv-black' }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </VAutocomplete>
            <AppSelect
              v-model="selectedTargetSizeId"
              :items="targetSizes"
              item-title="value"
              item-value="id"
              :disabled="!selectedTargetProductId"
              label="Размер"
              class="mt-2"
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
