<script setup lang="ts">
import { useDebounce } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { getClients } from '../../../services/clients';
import { deleteProduct, getProductsWithSizes } from '../../../services/products';
import type { Client } from '../../../types/client';
import type { WbProduct } from '../../../types/product';

const entityData = ref<WbProduct[]>([])

const headers = [
  { title: 'Название', key: 'name', sortable: false },
  { title: 'Артикул', key: 'article', sortable: false },
  { title: 'Цвет', key: 'color', sortable: false },
  { title: 'Размеры', key: 'sizes', sortable: false },
  { title: '', key: 'actions', sortable: false },
]

const isLoading = ref(false)
const searchQuery = ref<string>('')
const debouncedQuery = useDebounce(searchQuery, 400) 
const clients = ref<Client[]>([])
const selectedClientId = ref<number | undefined>()

const deleteDialog = ref(false)
const selectedDeleteId = ref<number | null>(null)
const selectedDeleteDisplayValue = ref<string>('')

const confirmationText = computed(() =>
  selectedDeleteId.value !== null
    ? `Удалить товар ${selectedDeleteDisplayValue.value}?`
    : ''
)

const openDeleteDialog = (id: number, name: string) => {
  selectedDeleteId.value = id
  selectedDeleteDisplayValue.value = name
  deleteDialog.value = true
}

const deleteItemConfirm = async () => {
  if (selectedDeleteId.value === null) return
  await handleDelete(selectedDeleteId.value)
  selectedDeleteId.value = null
}

const itemsPerPage = ref<number>(10)
const page = ref<number>(1)

watch(debouncedQuery, () => {
  fetchProducts()
})

const fetchClients = async () => {
  const { data, error } = await getClients()
  
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }

  clients.value = data.value || []
}

const fetchProducts = async () => {
  isLoading.value = true
  const { data, error } = await getProductsWithSizes(selectedClientId.value, searchQuery.value)
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  console.log(data.value)
  entityData.value = data.value
  isLoading.value = false
}

const handleDelete = async (id: number) => {
  try {
    const { error } = await deleteProduct(id)
    if (error.value) throw error.value

    await fetchProducts()
    showSnackbarMessage('Товар удалён', 'success')
  } catch (err: any) {
    console.error('Ошибка при удалении товара:', err)
    showSnackbarMessage('Произошла ошибка при удалении', 'error')
  }
}

const snackbar = ref({
  visible: false,
  color: 'success',
  text: '',
  timeout: 3000,
})

function showSnackbarMessage(message: string, color = 'success') {
  snackbar.value.text = message
  snackbar.value.color = color
  snackbar.value.visible = true
}

const entities = computed<WbProduct[]>(() => entityData.value)
const totalEntities = computed<number>(() => entities.value.length)
const displayedClientId = computed({
  get() {
    const id = selectedClientId.value;
    const exists = clients.value.some(c => c.id === id);
    return exists ? id : undefined;
  },
  set(value) {
    selectedClientId.value = value;
  }
});

onMounted(async () => {
  const savedClientId = localStorage.getItem('selectedProductClientId');
  if (savedClientId) {
    selectedClientId.value = JSON.parse(savedClientId);
  }

  fetchProducts();
  await fetchClients();
});

const handleClientChange = (newValue) => {
  localStorage.setItem('selectedProductClientId', JSON.stringify(newValue));
  console.log(JSON.stringify(newValue))
  fetchProducts();
};
const isTooltipVisible = ref(false)
</script>

<template>
  <div>
    <VCard
      title="Товары"
      class="mb-6"
    >
      <VDivider />

      <div class="d-flex flex-wrap gap-4 ma-6">
        <div class="d-flex align-center">
          <AppTextField
            v-model="searchQuery"
            placeholder="Введите название"
            style="inline-size: 200px;"
            class="me-3"
            clearable
          />
          <VSelect
            v-model="displayedClientId"
            :items="clients"
            item-title="name"
            item-value="id"
            label="Клиент"
            clearable
            style="inline-size: 200px;"
            class="me-3"
            @update:modelValue="handleClientChange"
          />
        </div>

        <VSpacer />
        <div class="d-flex gap-4 flex-wrap align-center">
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="$router.push({ name: 'product-details-id', params: { id: 0 } })"
          >
            Добавить товар
          </VBtn>
        </div>
      </div>

      <VDivider class="mt-4" />

      <VDataTableServer
        :headers="headers"
        show-select
        :items="entities"
        :items-length="totalEntities"
        class="text-no-wrap"
        :loading="isLoading"
      >
        <template #no-data>
          <!-- ничего не выводим -->
        </template>

        <template #loading>
          <div class="text-center pa-6">
            <VProgressCircular indeterminate color="primary" />
          </div>
        </template>
        <!-- name  -->
        <template #item.name="{ item }">
          <div
            class="d-flex align-center gap-x-4"
            style="cursor: pointer;"
          >
            <div class="d-flex flex-column">
              <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- color -->
        <template #item.color="{ item }">
          <div class="d-flex flex-column">
              <span>{{ item.color }}</span>
          </div>
        </template>

        <!-- sizes -->
        <template #item.sizes="{ item }">
          <div class="sizes-text" @click="isTooltipVisible = !isTooltipVisible">
            <div>
              <span>{{ item.sizes?.map(size => size.value).join(', ') }}</span>
            
            <VTooltip
              open-on-click
              :open-on-hover="false"
              :model-value="isTooltipVisible"
              location="right"
              activator="parent"
            >
              <VTable
                density="compact"
                class="text-no-wrap"
              >
              <!-- ajsdk1231 -->
                <thead>
                  <tr>
                    <th>
                      Баркод
                    </th>
                    <th>
                      Размер
                    </th>
                  </tr>
                </thead>

                <tbody style="font-size: 14px;">
                  <tr
                    v-for="size in item.sizes"
                    :key="size.barcode"
                  >
                    <td>
                      {{ size.barcode }}
                    </td>
                    <td>
                      {{ size.value }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VTooltip>
            </div>
          </div>
        </template>

        <!-- actions -->
        <template #item.actions="{ item }">
          <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
            <IconBtn>
              <VIcon icon="tabler-edit" />
            </IconBtn>
          </RouterLink>
          

          <IconBtn class="ms-4" @click="openDeleteDialog(item.id, item.name)">
            <VIcon
              icon="tabler-trash"
              value="delete"
            />
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalEntities"
          />
        </template>
      </VDataTableServer>
    </VCard>
  </div>

  <ConfirmDeleteDialog
    v-model="deleteDialog"
    :confirmation-text="confirmationText"
    @confirm="deleteItemConfirm"
  />

  <VSnackbar
    v-model="snackbar.visible"
    :color="snackbar.color"
    :timeout="snackbar.timeout"
    location="top right"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>

<style lang="scss">
  .sizes-text {
    max-width: 150px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
</style>
