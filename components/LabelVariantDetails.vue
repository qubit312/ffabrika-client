<script setup lang="ts">
import type { ShortEntityParams } from '@db/apps/marking/types';
import { defineExpose, defineProps, onMounted, ref, watch } from 'vue';
import { createProductSize, deleteProductSize, getProductSizes, updateProductSize } from '../services/productSizes';
import type { ProductSizeWithLabels } from '../types/productSize';

interface Props {
  product: ShortEntityParams | null
  name: string
  labelId: number
}

const headers = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'value', sortable: false },
  { title: 'Кол-во Честных знаков', key: 'available_labels_count', sortable: false },
  { key: 'actions', sortable: false },
];

const props = defineProps<Props>()
const productSizeList = ref<ProductSizeWithLabels[]>([])
const editDialog = ref(false)
const deleteDialog = ref(false)
const currentItem = ref<ProductSizeWithLabels | null>(null)
const editedIndex = ref<number | null>(null)
const editedItem = ref<ProductSizeWithLabels>({ id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 })
const showLabelDialog = ref(false)
const isDialogVisible = ref(false);

const mapPS = (ps: ProductSizeWithLabels): ProductSizeWithLabels => ({
  id: ps.id,
  product_id: ps.product_id,
  value: ps.value,
  barcode: ps.barcode,
  available_labels_count: ps.available_labels_count,
})

watch(
  () => props.product,
  (newProduct: ShortEntityParams) => {
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
      barcode: editedItem.value.barcode,
    }

    if (editedIndex.value !== null && editedIndex.value > -1) {
      const { data: resp, error } = await updateProductSize(editedItem.value.id, payload)
      if (error.value || !resp.value.success) {
        throw new Error('Не удалось обновить вариант')
      }
      productSizeList.value[editedIndex.value] = mapPS(resp.value.data)
    } else {
      const { data: resp, error } = await createProductSize(payload)
      if (error.value) {
        throw new Error('Не удалось создать вариант. Ошибка: ' + resp.value)
      }
      productSizeList.value.push(mapPS(resp.value))
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
  editedItem.value = { id: 0, value: '', barcode: '', available_labels_count: 0, product_id: 0 }
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

const handleRefresh = () => {
  if (props.product?.id != null) {
    fetchSizes(props.product.id)
  }
}

onMounted(() => {
  if (props.product?.id != null) {
    fetchSizes(props.product.id)
  }
})
</script>

<template>
  <VBtn color="primary" class="mb-4 me-4" @click="addItem">
      Добавить размер
  </VBtn>

  <VBtn
    color="primary"
    class="mb-4"
    :disabled="!props.product?.id"
    @click="handleRefresh"
  >
    Обновить информацию
  </VBtn>

  <VDataTable
    :headers="headers"
    :items="productSizeList"
    :items-per-page="5"
  >
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <IconBtn @click="editItem(item)">
          <VIcon icon="tabler-edit" />
        </IconBtn>
        <IconBtn @click="deleteItem(item)">
          <VIcon icon="tabler-trash" />
        </IconBtn>
        <IconBtn @click="openPrintDialog(item)">
          <VIcon icon="tabler-printer" />
        </IconBtn>
        <IconBtn @click="showLabelDialog = true">
          <VIcon icon="tabler-arrows-shuffle" />
        </IconBtn>
      </div>
    </template>
  </VDataTable>

  <VDialog
    v-model="editDialog"
    max-width="600px"
  >
    <VCard>
      <VCardTitle>
        <span class="headline">Редактирование</span>
      </VCardTitle>

      <VCardText>
        <VContainer>
          <VRow>
            <VCol
              cols="12"
              sm="6"
              md="6"
            >
              <VTextField
                v-model="editedItem.barcode"
                label="Баркод"
              />
            </VCol>

            <VCol
              cols="12"
              sm="6"
              md="6"
            >
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

  <!-- 👉 Delete Dialog  -->
  <VDialog
    v-model="deleteDialog"
    max-width="350px"
  >
    <VCard>
        <VCardTitle>
            Подтверждение
        </VCardTitle>
        <VCardText>
            Удалить размер {{editedItem.value}}?
        </VCardText>
        <VCardActions>
            <VSpacer />
            <VBtn
              color="secondary"
              variant="elevated"
              @click="closeDelete"
            >
              Закрыть
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
    v-if="currentItem"
    v-model:visible="isDialogVisible"
    :name="props.name ?? ''"
    :sizeId="currentItem.id"
    :article="currentItem.barcode"
    :size="currentItem.value"
    :availableLabelsCount="currentItem.available_labels_count"
    :labelId="props.labelId"
    @labels-updated="onLabelsUpdated"
  />
  <UpdateChzLabel
    v-if="props.product && props.product.id"
    v-model="showLabelDialog"
    :productId="props.product.id"
  />
</template>
