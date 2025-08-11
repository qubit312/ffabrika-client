<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getClients } from '../../../services/clients';
import { getLabelsWithFilters, removeLabel } from '../../../services/labels';
import type { Client } from '../../../types/client';
import type { FilterRequest } from '../../../types/filter';
import type { Label } from '../../../types/label';
import AddNewProductDrawer from '../../../views/pages/product/list/AddNewProductDrawer.vue';

const headers = [
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Артикул', key: 'product.article', sortable: true },
  { title: 'Цвет', key: 'product.color', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]
const isDrawerOpen = ref(true)
const isLoading = ref(false)
const router = useRouter()
const clients = ref<Client[]>([])
const selectedClientId = ref<number | undefined>()
const labels = ref<Label[]>()
const searchQuery     = ref<string>('')
const isSearchFocused = ref<boolean>(false)
const showCreateDialog = ref(false)
const itemsPerPage = ref<number>(10)
const page = ref<number>(1)
const totalLabels = computed<number>(() => labels.value?.length || 0)

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

const fetchLabels = async () => {
  isLoading.value = true
  const payload: FilterRequest = {
    filters: [],
    sort_by: sortBy.value?.key ?? 'name',
    sort_dir: sortBy.value?.order ?? 'asc',
  }

  if(selectedClientId.value) {
    payload.filters?.push({ field: 'product.client_id', op: 'eq', value: selectedClientId.value })
  }

  if (searchQuery.value) {
    payload.filters?.push({ field: 'name', op: 'like', value: searchQuery.value })
  }
  
  const { data, error } = await getLabelsWithFilters(payload)
  if (error.value) {
    console.error('Ошибка при загрузке этикеток', error.value)
    return
  }

  if (data.value) {
    labels.value = data.value
  }

  isLoading.value = false
}

const handleDelete = async (id: number) => {
  try {
    const res = await removeLabel(id)
    await fetchLabels()
    showSnackbarMessage('Этикетка удалена', 'success')
  } catch (err: any) {
    console.error('Ошибка при удалении этикетки:', err)
    showSnackbarMessage('Произошла ошибка при удалении', 'error')
  }
}

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
  const savedClientId = localStorage.getItem('selectedClientId');
  if (savedClientId) {
    selectedClientId.value = JSON.parse(savedClientId);
  }
  fetchLabels()
  await fetchClients()
})

const handleClientChange = (newValue) => {
  localStorage.setItem('selectedClientId', JSON.stringify(newValue));
  console.log(JSON.stringify(newValue))
  fetchLabels();
};

const fetchClients = async () => {
  const { data, error } = await getClients()
  
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }

  clients.value = data.value || []
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

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const onOptionsUpdate = (options: any) => {
  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }

  fetchLabels()
}
</script>

<template>
  <div>
    <VCard
      title="Этикетки"
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
            @update:modelValue="fetchLabels"
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
          <!-- <VBtn
            color="primary"
            prepend-icon="tabler-box"
            @click="router.push({ name: 'label-details-id', params: { id: 0 } })"
          >
            По существующему товару
          </VBtn> -->

          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="showCreateDialog = true"
          >
            Новый товар
          </VBtn>
        </div>
      </div>

      <VDivider class="mt-4" />
      <VDataTableServer
        :headers="headers"
        show-select
        :items="labels"
        :items-length="totalLabels"
        class="text-no-wrap"
        :loading="isLoading"
        @update:options="onOptionsUpdate"
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
              <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>
        
        <!-- article -->
        <template #item.product.article="{ item }">
          {{ item.product?.article || '—' }}
        </template>

        <!-- color -->
        <template #item.product.color="{ item }">
          {{ item.product?.color || '—' }}
        </template>

        <!-- actions -->
        <template #item.actions="{ item }">
          <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }">
            <IconBtn>
              <VIcon icon="tabler-edit" />
            </IconBtn>
          </RouterLink>
          
          <IconBtn class="ms-4" @click="openDeleteDialog(item.id, item.name)">
            <VIcon icon="tabler-trash" value="delete" />
          </IconBtn>
        </template>

        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalLabels"
          />
        </template>
      </VDataTableServer>
    </VCard>
  </div>
  
  <AddNewProductDrawer
    v-model:isDrawerOpen="showCreateDialog"
    @created="fetchLabels"
  />
  
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

<style scoped>
</style>
