<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { deleteClient, getClients } from '../../../services/clients';

interface Client {
  id: number
  name: string
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY'
  phone: string
  email: string
  telegram: string
}

const typeCaption: Record<Client['type'], string> = {
  INDIVIDUAL:    'Физическое лицо',
  LEGAL_ENTITY:  'Юридическое лицо',
}
const isLoading = ref(false)
const headers = [
  { title: 'Название', key: 'name', sortable: false },
  { title: 'Тип', key: 'type', sortable: false },
  { title: 'Телефон', key: 'phone', sortable: false },
  { title: 'Почта', key: 'email', sortable: false },
  { title: 'Телеграм', key: 'telegram', sortable: false },
  { title: '', key: 'actions', sortable: false },
]

const clients = ref<Client[]>([])
const totalClients = computed<number>(() => clients.value.length)

const searchQuery     = ref<string>('')
const isSearchFocused = ref<boolean>(false)

const itemsPerPage = ref<number>(10)
const page = ref<number>(1)

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

const fetchClients = async () => {
  isLoading.value = true
  const { data, error } = await getClients()
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }

  clients.value = data.value || []
  isLoading.value = false
}

const handleDelete = async (id: number) => {
  try {
    const { error } = await deleteClient(id)
    if (error.value) throw error.value
    await fetchClients()
  } catch (e) {
    console.error('Ошибка удаления клиента:', e)
  }
}

onMounted(fetchClients)
</script>

<template>
  <div>
    <!-- marking -->
    <VCard
      title="Клиенты"
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
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
            clearable
          />
          <div v-if="isSearchFocused" class="development-note">
            Функция поиска ещё в разработке
          </div>
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
            @click="$router.push({ name: 'client-details-id', params: { id: 0 } })"
          >
            Добавить клиента
          </VBtn>
        </div>
      </div>

      <VDivider class="mt-4" />

      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        show-select
        :items="clients"
        :items-length="totalClients"
        :loading="isLoading"
        class="text-no-wrap"
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
              <RouterLink :to="{ name: 'client-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- type -->
        <template #item.type="{ item }">
          <span class="text-body-1 text-high-emphasis">{{ typeCaption[item.type] }}</span>
        </template>

        <!-- phone -->
        <template #item.phone="{ item }">
          <span class="text-body-1 text-high-emphasis">{{ item.phone }}</span>
        </template>

        <!-- email -->
        <template #item.email="{ item }">
          <span class="text-body-1 text-high-emphasis">{{ item.email }}</span>
        </template>

        <!-- telegram -->
        <template #item.telegram="{ item }">
          <span class="text-body-1 text-high-emphasis">{{ item.telegram }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <RouterLink :to="{ name: 'client-details-id', params: { id: item.id } }">
            <IconBtn>
              <VIcon icon="tabler-edit" />
            </IconBtn>
          </RouterLink>

          <IconBtn class="ms-4" @click="openDeleteDialog(item.id, item.name)">
            <VIcon icon="tabler-trash" value="delete" />
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalClients"
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

<style scoped>
  .development-note {
    margin-top: 4px;
    font-size: 0.9rem;
    color: grey;
  }
</style>
