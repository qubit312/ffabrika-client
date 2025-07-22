<script setup lang="ts">
import { ref, watch } from 'vue'
import { deleteProductSize, getProductSizes } from '../services/productSizes'
import type { ProductSizeWithLabels } from '../types/productSize'

const productSizeList = ref<ProductSizeWithLabels[]>([])
const editedItem = ref<ProductSizeWithLabels>({ id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 })
const deleteItemId = ref<number | null>(null)
const props = defineProps<{
  productId: number
}>()


const editDialog = ref(false)
const deleteDialog = ref(false)

const sizeHeaders = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'value', sortable: false },
  { title: 'Кол-во Честных знаков', key: 'available_labels_count', sortable: false },
  { key: 'actions', sortable: false }
]

const fetchSizes = async (productId: number) => {
  const { data, error } = await getProductSizes(productId)
  if (error.value) {
    console.error('Ошибка загрузки размеров:', error.value)
    return
  }
  productSizeList.value = data.value.data.map(mapPS)
}

watch(() => props.productId, (newId) => {
  if (newId) fetchSizes(newId)
}, { immediate: true })

const mapPS = (ps: ProductSizeWithLabels): ProductSizeWithLabels => ({
  id: ps.id,
  product_id: ps.product_id,
  value: ps.value,
  barcode: ps.barcode,
  available_labels_count: ps.available_labels_count,
})

const editItem = (item: ProductSizeWithLabels) => {
  editedItem.value = { ...item }
  editDialog.value = true
}

const saveVariant = () => {
  const index = productSizeList.value.findIndex(p => p.id === editedItem.value?.id)
  if (index !== -1 && editedItem.value) {
    productSizeList.value[index] = { ...editedItem.value }
  }
  editDialog.value = false
  editedItem.value = { id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 }
}

const deleteItem = (item: ProductSizeWithLabels) => {
  deleteItemId.value = item.id
  deleteDialog.value = true
}

const deleteItemConfirm = async () => {
  if (!deleteItemId.value) {
    return;
  }

  try {
    const { error } = await deleteProductSize(deleteItemId.value)
    if (error.value) throw error.value

    productSizeList.value = productSizeList.value.filter(p => p.id !== deleteItemId.value)
    deleteDialog.value = false
    deleteItemId.value = null
  } catch (e: any) {
    console.error('Ошибка удаления:', e)
  }
}

const closeEdit = () => {
  editDialog.value = false
  editedItem.value = { id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 }
}

const closeDelete = () => {
  deleteDialog.value = false
  deleteItemId.value = null
}

const addItem = () => {
  editedIndex.value = null
  editedItem.value = { id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 }
  editDialog.value = true
}

const deleteConfirmationQuestion = 'Вы уверены, что хотите удалить этот размер?'
</script>

<template>
  <div class="d-flex align-center mb-4">
    <h2 class="text-h5 ma-0">Размеры</h2>

    <VBtn
      class="ms-2"
      icon
      size="small"
      variant="text"
      @click="addItem"
    >
      <VIcon icon="tabler-plus" />
    </VBtn>
  </div>

  <VDataTable
    :headers="sizeHeaders"
    :items="productSizeList"
    item-value="id"
  >
    <template #no-data></template>
    <template #bottom></template>
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

  <VDialog v-model="editDialog" max-width="600px">
    <VCard>
      <VCardTitle>
        <span class="headline">Редактирование</span>
      </VCardTitle>

      <VCardText>
        <VContainer>
          <VRow>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="editedItem.barcode"
                label="Баркод"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="editedItem.value"
                label="Размер"
              />
            </VCol>
          </VRow>
        </VContainer>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn color="secondary" variant="outlined" @click="closeEdit">Закрыть</VBtn>
        <VBtn color="primary" variant="elevated" @click="saveVariant">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="deleteDialog" max-width="350px">
    <VCard>
      <VCardText class="pt-6 pb-4 text-h6">
        {{ deleteConfirmationQuestion }}
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="secondary" variant="elevated" @click="closeDelete">Отменить</VBtn>
        <VBtn color="primary" variant="elevated" @click="deleteItemConfirm">ОК</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
