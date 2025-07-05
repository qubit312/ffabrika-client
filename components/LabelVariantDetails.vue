<script setup lang="ts">
import PrintLabelDialog from '@/components/dialogs/PrintLabelDialog.vue';
import type { ShortEntityParams } from '@db/apps/marking/types';
import { defineExpose, defineProps, ref, watch } from 'vue';

interface Props {
  product: ShortEntityParams | null
  name: string
  article: string
  composition: string
  color: string
  client: ShortEntityParams | null
  labelId: number
}

interface ProductSize {
  id: number
  product_id: number
  value: string
  barcode: string
  availableLabelsCount: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface PaginatedResponse<T> {
  data: T[]
}

const props = defineProps<Props>()

const productSizeList = ref<ProductSize[]>([])
const editDialog = ref(false)
const deleteDialog = ref(false)
const currentItem = ref<ProductSize | null>(null)
const editedIndex = ref<number | null>(null)
const editedItem = ref<ProductSize>({ id: 0, value: '', barcode: '', availableLabelsCount: 0, product_id: 0 })
const token = localStorage.getItem('access_token') || ''
const apiHeaders = token ? { Authorization: `Bearer ${token}` } : {}
const showLabelDialog = ref(false)

const headers = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'value', sortable: false },
  { title: 'Кол-во Честных знаков', key: 'availableLabelsCount', sortable: false },
  { title: '', key: 'actions', sortable: false },
];

const mapPS = (ps: ProductSize): ProductSize => ({
  id: ps.id,
  product_id: ps.product_id,
  value: ps.value,
  barcode: ps.barcode,
  availableLabelsCount: ps.available_labels_count,
})

const fetchVariants = async (productId) => {
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
  productSizeList.value = data.value.data.map(mapPS)
}

watch(
  () => props.product,
  (newProduct: ShortEntityParams) => {
    if (newProduct?.id != null) {
      fetchVariants(newProduct.id)
    }
  },
  { immediate: true }
)

const isDialogVisible = ref(false);

const editItem = (item: ProductSize) => {
  editedIndex.value = productSizeList.value.indexOf(item);
  editedItem.value = { ...item };
  editDialog.value = true;
};

const saveVariant = async () => {
  try {
    if (editedIndex.value !== null && editedIndex.value > -1) {
      const { data: resp, error } = await useApi<ApiResponse<ProductSize>>(
        `/api/product-sizes/${editedItem.value.id}`,
        {
          method: 'PUT',
          body: {
            product_id: props.product.id,
            value:      editedItem.value.value,
            barcode:    editedItem.value.barcode,
          },
          headers: apiHeaders
        }
      )
      if (error.value || !resp.value.success) {
        throw new Error('Не удалось обновить вариант')
      }
      const updated = resp.value.data
      productSizeList.value[editedIndex.value] = mapPS(updated)
    } else {
      const { data: resp, error } = await useApi<ApiResponse<ProductSize>>(
        '/api/product-sizes',
        {
          method: 'POST',
          body: {
            product_id: props.product.id,
            value:      editedItem.value.value,
            barcode:    editedItem.value.barcode,
          },
          headers: apiHeaders
        }
      )
      if (error.value) {
        throw new Error('Не удалось создать вариант. Ошибка: ' + resp.value)
      }
      const created = resp.value
      productSizeList.value.push(mapPS(created))
    }
  } catch (e: any) {
    console.error('Ошибка сохранения:', e)
  } finally {
    editDialog.value   = false
    editedIndex.value  = null
  }
}

const deleteVariant = async () => {
  try {
    const { error } = await useApi(
      `/api/product-sizes/${editedItem.value.id}`,
      { 
        method: 'DELETE',
        headers: apiHeaders
      }
    )
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

const openPrintDialog = (item: ProductSize) => {
  currentItem.value = item
  isDialogVisible.value = true
}

const addItem = () => {
  editedIndex.value = null
  editedItem.value = { id: 0, value: '', barcode: '', availableLabelsCount: 0, product_id: 0 }
  editDialog.value = true
}

const closeEdit = () => {
  editDialog.value = false
  editedIndex.value = null
}

const deleteItem = (item: ProductSize) => {
  editedIndex.value = productSizeList.value.indexOf(item)
  editedItem.value = { ...item }
  deleteDialog.value = true
}

const closeDelete = () => {
  deleteDialog.value = false
  editedIndex.value = null
}

const deleteItemConfirm = async () => {
  await deleteVariant()
}

defineExpose({ onLabelsUpdated })

function onLabelsUpdated() {
  fetchVariants(props.product.id)
}
</script>

<template>
  <VBtn color="primary" class="mb-4 me-4" @click="addItem">
      Добавить размер
  </VBtn>

  <VBtn
    color="primary"
    class="mb-4"
    :disabled="!props.product?.id"
    @click="fetchVariants(props.product.id)"
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
          color="error"
          variant="outlined"
          @click="closeEdit"
        >
          Закрыть
        </VBtn>

        <VBtn
          color="success"
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
              color="error"
              variant="elevated"
              @click="closeDelete"
            >
              Закрыть
            </VBtn>

            <VBtn
              color="success"
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
    :name="props.name ?? ''"
    :sizeId="currentItem?.id ?? 0"
    :article="currentItem?.barcode ?? ''"
    :composition="props.composition ?? ''"
    :color="props.color ?? ''"
    :size="currentItem?.value ?? ''"
    :client="props.client ?? null"
    :availableLabelsCount="currentItem?.availableLabelsCount ?? 0"
    :labelId="props.labelId"
    @labels-updated="onLabelsUpdated"
  />
    <UpdateChzLabel
    v-model="showLabelDialog"
    :productId="props.product?.id"
  />
</template>
