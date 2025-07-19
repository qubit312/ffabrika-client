<script setup lang="ts">
import { useDebounce } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { getClients } from '../../../services/clients';
import { deleteProduct, getProducts } from '../../../services/products';
import type { Client } from '../../../types/client';
import type { WbProduct } from '../../../types/product';

const entityData = ref<WbProduct[]>([])

const headers = [
  { title: 'Название', key: 'name', sortable: false },
  { title: 'Артикул', key: 'article', sortable: false },
  { title: 'Цвет', key: 'color', sortable: false },
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
  const { data, error } = await getProducts(selectedClientId.value, searchQuery.value)
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  entityData.value = data.value
  isLoading.value = false
}

const handleDelete = async (id: number) => {
  try {
    const { error } = await deleteProduct(id)
    if (error.value) throw error.value
    await fetchProducts()
  } catch (err: any) {
    console.error('Ошибка при удалении товара:', err)
  }
}

const entities = computed<WbProduct[]>(() => entityData.value)
const totalEntities = computed<number>(() => entities.value.length)

onMounted(() => {
  fetchProducts()
  fetchClients()
})

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
            v-model="selectedClientId"
            :items="clients"
            item-title="name"
            item-value="id"
            label="Клиент"
            clearable
            style="inline-size: 200px;"
            class="me-3"
            @update:modelValue="fetchProducts"
          />
        </div>

        <VSpacer />
        <div class="d-flex gap-4 flex-wrap align-center">
          <AppSelect
            v-model="itemsPerPage"
            :items="[5, 10, 20, 25, 50]"
          />
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
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
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
</template>
