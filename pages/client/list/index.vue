<script setup lang="ts">
import { useCurrentClient } from '@/composables/useCurrentClient';
import { computed, onMounted, ref } from 'vue';
import { deleteClient, getClientsWithFilters } from '../../../services/clients';
import type { FilterRequest } from '../../../types/filter';

interface Client {
  id: number
  name: string
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY' | 'FULFILLMENT'
  phone: string
  email: string
  telegram: string
}

const typeCaption: Record<Client['type'], string> = {
  INDIVIDUAL:    'Индивидуальный предприниматель',
  LEGAL_ENTITY:  'Юридическое лицо',
  FULFILLMENT:  'Фулфилмент',
}

const isLoading = ref(false)
const headers = [
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Тип', key: 'type', sortable: true },
  { title: 'Телефон', key: 'phone', sortable: true },
  { title: 'Почта', key: 'email', sortable: true },
  { title: 'Телеграм', key: 'telegram', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]

const clients = ref<Client[]>([])
const totalClients = computed<number>(() => clients.value.length)

const searchQuery     = ref<string>('')

const itemsPerPage = ref<number>(10)
const page = ref<number>(1)

const deleteDialog = ref(false)
const selectedDeleteId = ref<number | null>(null)
const selectedDeleteDisplayValue = ref<string>('')

const copiedField = ref<string | null>(null)

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
  const { currentClientId } = useCurrentClient()
  if (!currentClientId.value) {
    return;
  }

  isLoading.value = true
  const payload: FilterRequest = {
    filters: [],
    sort_by: sortBy.value?.key ?? 'name',
    sort_dir: sortBy.value?.order ?? 'asc',
  }

  if (searchQuery.value) {
    payload.filters?.push({ field: 'name', op: 'like', value: searchQuery.value })
  }

  const { data, error } = await getClientsWithFilters(payload)
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
    showSnackbarMessage('Клиент удален', 'success')
  } catch (e) {
    console.error('Ошибка удаления клиента:', e)
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

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const onOptionsUpdate = (options: any) => {
  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }

  fetchClients()
}

const copyToClipboard = (text: string, field: string) => {
  if (text) {
    navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => {
      copiedField.value = null
    }, 2000) 
  }
}

onMounted(fetchClients)
</script>

<template>
  <div>
    <!-- marking -->
    <VCard
      title="Организации"
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
            @update:modelValue="fetchClients"
          />
        </div>

        <VSpacer />
        <div class="d-flex gap-4 flex-wrap align-center">
          <!-- <AppSelect
            v-model="itemsPerPage"
            :items="[5, 10, 20, 25, 50]"
          /> -->
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
        :headers="headers"
        :items="clients"
        :items-length="totalClients"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="onOptionsUpdate"
      >
        <template #no-data>
        </template>

        <template #loading>
          <div class="text-center pa-6">
            <VProgressCircular indeterminate color="primary" />
          </div>
        </template>
        
        <template #item.name="{ item }">
          <div
            class="d-flex align-center gap-x-4 pointer"
          >
            <div class="d-flex flex-column hoverable">
              <RouterLink :to="{ name: 'client-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- type -->
        <template #item.type="{ item }">
          <span class="text-body-1 text-high-emphasis hoverable pointer">{{ typeCaption[item.type] }}</span>
        </template>

        <!-- phone -->
        <template #item.phone="{ item }">
          <VTooltip :model-value="copiedField === 'phone'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'phone'">
            <template #activator="{ props }">
              <span
                v-bind="props"
                class="text-body-1 text-high-emphasis hoverable pointer"
                @click="copyToClipboard(item.phone || '', 'phone')"
              >
                {{ item.phone || 'Не указано' }}
              </span>
            </template>
            {{ copiedField === 'phone' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
          </VTooltip>
        </template>

        <!-- email -->
        <template #item.email="{ item }">
          <VTooltip :model-value="copiedField === 'email'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'email'">
            <template #activator="{ props }">
              <span
                v-bind="props"
                class="text-body-1 text-high-emphasis hoverable pointer"
                @click="copyToClipboard(item.email || '', 'email')"
              >
                {{ item.email || 'Не указано' }}
              </span>
            </template>
            {{ copiedField === 'email' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
          </VTooltip>
        </template>

        <!-- telegram -->
        <template #item.telegram="{ item }">
          <VTooltip :model-value="copiedField === 'telegram'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'telegram'">
            <template #activator="{ props }">
              <span
                v-bind="props"
                class="text-body-1 text-high-emphasis hoverable pointer"
                @click="copyToClipboard(item.telegram || '', 'telegram')"
              >
                {{ item.telegram || 'Не указано' }}
              </span>
            </template>
            {{ copiedField === 'telegram' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
          </VTooltip>
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
.development-note {
  margin-top: 4px;
  font-size: 0.9rem;
  color: grey;
}
</style>
