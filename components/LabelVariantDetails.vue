<script setup lang="ts">
import { computed, defineExpose, defineProps, onMounted, onUnmounted, ref, watch } from 'vue';
import { useLabelEvents } from '../composables/useLabelBus';
import { createProductSize, deleteProductSize, getProductSizes, updateProductSize } from '../services/productSizes';
import type { NewLabelInterface } from '../types/label';
import type { Printer } from '../types/printer';
import type { WbProduct } from '../types/product';
import type { ProductSizeWithLabels } from '../types/productSize';

interface Props {
  product: WbProduct
  name: string
  label: NewLabelInterface | null
  parentComponent: string
  printer: Printer | null
}

const emit = defineEmits<{
  (e: 'printer-updated', v: number | null): void;
  (e: 'download-started', callback: (result: boolean) => void): void;
  (e: 'callParentMethod', v: ProductSizeWithLabels | null): void;
}>()

const headers = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'value', sortable: false },
  { title: 'Рос. Размер', key: 'tech_size', sortable: false },
  { title: 'ЧЗ', key: 'available_labels_count', sortable: false },
  { title: 'Действия', key: 'actions', sortable: false },
];

const { registerLabelUpdateListener, unregisterLabelUpdateListener } = useLabelEvents()
const props = defineProps<Props>()
const productSizeList = ref<ProductSizeWithLabels[]>([])
const editDialog = ref(false)
const deleteDialog = ref(false)
const currentItem = ref<ProductSizeWithLabels | null>(null)
const editedIndex = ref<number | null>(null)
const editedItem = ref<ProductSizeWithLabels>({ id: 0, value: '', barcode: '', tech_size: '', available_labels_count: 0, product_id: 0 })

const deleteConfirmationQuestion = computed(() => {
  let question  = `Удалить размер ${editedItem.value.value}?`
  return question;
})
const showLabelDialog = ref(false)
const isDialogVisible = ref(false);

const isLabelParent = computed(() => {
  if (!props.label || !props.label.id) {
    return false
  }
  return true
})

const mapPS = (ps: ProductSizeWithLabels): ProductSizeWithLabels => ({
  id: ps.id,
  product_id: ps.product_id,
  value: ps.value,
  tech_size: ps.tech_size,
  barcode: ps.barcode,
  available_labels_count: ps.available_labels_count,
})

watch(
  () => props.product,
  (newProduct: WbProduct) => {
    if (newProduct?.id != null) {
      fetchSizes(newProduct.id)
    }
  },
)

const fetchSizes = async (productId: number) => {
  const { data, error } = await getProductSizes(productId)
  if (error.value) {
    console.error('Ошибка загрузки размеров:', error.value)
    return
  }

  productSizeList.value = data.value.data.map(mapPS)  
}

const saveVariant = async () => {
  try {
    if (!props.product?.id) {
      console.error('saveVariant: product не определён')
      return
    }

    const payload = {
      product_id: props.product.id,
      value: editedItem.value.value,
      tech_size: editedItem.value.tech_size,
      barcode: editedItem.value.barcode,
    }

    if (editedIndex.value !== null && editedIndex.value > -1) {
      const { data: resp, error } = await updateProductSize(editedItem.value.id, payload)
      if (error.value || !resp.value.success) {
        throw new Error('Не удалось обновить вариант')
      }
      productSizeList.value[editedIndex.value] = mapPS(resp.value.data)
      emit('callParentMethod', resp.value.data)
    } else {
      const { data: resp, error } = await createProductSize(payload)
      if (error.value) {
        throw new Error('Не удалось создать вариант. Ошибка: ' + resp.value)
      }
      productSizeList.value.push(mapPS(resp.value))
      emit('callParentMethod', resp.value)
    }
  } catch (e: any) {
    console.error('Ошибка сохранения:', e)
  } finally {
    editDialog.value = false
    editedIndex.value = null
  }
}

const deleteSize = async () => {
  try {
    const { error } = await deleteProductSize(editedItem.value.id)
    if (error.value) throw error.value

    if (editedIndex.value !== null && editedIndex.value > -1) {
      productSizeList.value.splice(editedIndex.value, 1)
    }
  } catch (e: any) {
    console.error('Ошибка удаления:', e)
  } finally {
    deleteDialog.value = false
    editedIndex.value = null
  }
}
const openPrintDialog = (item: ProductSizeWithLabels) => {
  currentItem.value = item
  isDialogVisible.value = true
}

const editItem = (item: ProductSizeWithLabels) => {
  editedIndex.value = productSizeList.value.indexOf(item);
  editedItem.value = { ...item };
  editDialog.value = true;
};

const addItem = () => {
  editedIndex.value = null
  editedItem.value = { id: 0, value: '', tech_size: '', barcode: '', available_labels_count: 0, product_id: 0 }
  editDialog.value = true
}

const closeEdit = () => {
  editDialog.value = false
  editedIndex.value = null
}

const deleteItem = (item: ProductSizeWithLabels) => {
  editedIndex.value = productSizeList.value.indexOf(item)
  editedItem.value = { ...item }
  deleteDialog.value = true
}

const closeDelete = () => {
  deleteDialog.value = false
  editedIndex.value = null
}

const deleteItemConfirm = async () => {
  await deleteSize()
}

defineExpose({ onLabelsUpdated })

function onLabelsUpdated() {
  if (props.product?.id != null) {
    fetchSizes(props.product.id)
  } else {
    console.warn('onLabelsUpdated: product не определён')
  }
}

onMounted(() => {
  if (props.product?.id != null) {
    fetchSizes(props.product.id)
  }
  registerLabelUpdateListener(onLabelsUpdated)
})

onUnmounted(() => {
  unregisterLabelUpdateListener(onLabelsUpdated)
})

function handleDownloadStarted(callback: (result: boolean) => void) {
  emit('download-started', callback)
}

</script>

<template>
  <VDataTable
    :headers="headers"
    :items="productSizeList"
  >
    <template #no-data></template>
    <template #bottom></template>
    <template #header.available_labels_count="{ column }">
      <VTooltip open-delay="400">
        <template #activator="{ props }">
          <span v-bind="props" class="text-truncate">{{ column.title }}</span>
        </template>
        <span>Кол-во честных знаков</span>
      </VTooltip>
    </template>
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <VTooltip open-delay="600">
          <template #activator="{ props }"> 
            <IconBtn v-bind="props" @click="editItem(item)">
              <VIcon icon="tabler-edit" />
            </IconBtn>
          </template>
          <span>Редактировать</span>
        </VTooltip>
        <VTooltip open-delay="600" v-if="parentComponent === 'marking'">
          <template #activator="{ props }">
            <IconBtn
              v-bind="props"
              @click="openPrintDialog(item)"
              color="primary"
              variant="tonal"
            >
              <VIcon icon="tabler-printer" />
            </IconBtn>
          </template>
          <span>Распечать этикетку</span>
        </VTooltip>
        <VTooltip open-delay="600">
          <template #activator="{ props }"> 
            <IconBtn v-if="isLabelParent" v-bind="props" @click="showLabelDialog = true">
              <VIcon icon="tabler-arrows-shuffle" />
            </IconBtn>
          </template>
          <span>Перенести на другой товар</span>
        </VTooltip>
        <VTooltip open-delay="600">
          <template #activator="{ props }"> 
            <IconBtn v-bind="props" @click="deleteItem(item)">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </template>
          <span>Удалить</span>
        </VTooltip>
      </div>
    </template>
  </VDataTable>
  <VBtn color="primary" class="mb-4 me-4 mt-4" @click="addItem">
    Добавить размер
  </VBtn>
  
  <VDialog v-model="editDialog" max-width="500px" >
    <VCard>
      <VCardTitle>
        <span class="headline">Редактирование</span>
      </VCardTitle>

      <VCardText>
        <VContainer>
          <VRow>
            <VCol cols="12" >
              <VTextField
                v-model="editedItem.barcode"
                label="Баркод"
              />
            </VCol>

            <VCol cols="12" >
              <VTextField
                v-model="editedItem.value"
                label="Размер"
              />
            </VCol>

            <VCol cols="12" >
              <VTextField
                v-model="editedItem.tech_size"
                label="Рос. Размер"
              />
            </VCol>
          </VRow>
        </VContainer>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          color="secondary"
          variant="outlined"
          @click="closeEdit"
        >
          Закрыть
        </VBtn>

        <VBtn
          color="primary"
          variant="elevated"
          @click="saveVariant"
        >
          Сохранить
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog
    v-model="deleteDialog"
    max-width="350px"
  >
    <VCard>
      <VCardText class="pt-6 pb-4 text-h6">
        {{ deleteConfirmationQuestion }}
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          color="secondary"
          variant="elevated"
          @click="closeDelete"
        >
          Отменить
        </VBtn>

        <VBtn
          color="primary"
          variant="elevated"
          @click="deleteItemConfirm"
        >
          ОК
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  <PrintLabelDialog
    v-model:visible="isDialogVisible"
    :label="props.label"
    :size="currentItem"
    :printer="props.printer"
    @printer-updated="emit('printer-updated', $event)"
    @download-started="handleDownloadStarted"
  />
  <UpdateChzLabel
    v-if="isLabelParent && props.product && props.product.id"
    v-model="showLabelDialog"
    :product="props.product"
  />
</template>
