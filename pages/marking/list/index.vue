<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CreateProductDialog from '../../../components/dialogs/CreateProductDialog.vue';
import { getLabels, removeLabel } from '../../../services/labels';
import type { Label } from '../../../types/label';

const headers = [
  { title: 'Наименование', key: 'name', sortable: false },
  { title: '', key: 'actions', sortable: false },
]

const isLoading = ref(false)
const router = useRouter()
const markingsData = ref<{ markings: Label[]; total: number }>({ markings: [], total: 0 })
const searchQuery     = ref<string>('')
const isSearchFocused = ref<boolean>(false)
const showCreateDialog = ref(false)
const itemsPerPage = ref<number>(10)
const page = ref<number>(1)
const sortBy = ref<string | undefined>()
const orderBy = ref<'asc' | 'desc' | undefined>()
const markings = computed<Label[]>(() => markingsData.value.markings)
const totalMarkings = computed<number>(() => markingsData.value.total)

const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

const fetchMarkings = async () => {
  isLoading.value = true
  const { data, error } = await getLabels()
  if (error.value) {
    console.error('Ошибка при загрузке этикеток', error.value)
    return
  }

  if (data.value) {
    markingsData.value = {
      markings: data.value.data,
      total:    data.value.total,
    }
  }
  isLoading.value = false
}

const handleDelete = async (id: number) => {
  try {
    const res = await removeLabel(id)
    console.log(res)
    await fetchMarkings()
  } catch (err: any) {
    console.error('Ошибка при удалении этикетки:', err)
  }
}

onMounted(() => {
  fetchMarkings()
})
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
            prepend-icon="tabler-box"
            @click="router.push({ name: 'marking-details-id', params: { id: 0 } })"
          >
            По существующему товару
          </VBtn>

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
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        show-select
        :items="markings"
        :items-length="totalMarkings"
        class="text-no-wrap"
        :loading="isLoading"
        @update:options="updateOptions"
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

        <!-- category -->
        <!-- <template #item.category="{ item }">
          <VAvatar
            size="30"
            variant="tonal"
            :color="resolveCategory(item.category)?.color"
            class="me-4"
          >
            <VIcon
              :icon="resolveCategory(item.category)?.icon"
              size="18"
            />
          </VAvatar>
          <span class="text-body-1 text-high-emphasis">{{ getCategoryLabel(item.category) }}</span>
        </template> -->

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn>
            <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }">
              <VIcon icon="tabler-edit" />
            </RouterLink>
          </IconBtn>
          
          <IconBtn>
            <VIcon class="ms-4" icon="tabler-trash" value="delete" @click="handleDelete(item.id)"/>
          </IconBtn>
        </template>

        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalMarkings"
          />
        </template>
      </VDataTableServer>
    </VCard>
  </div>
  
  <CreateProductDialog
    v-model="showCreateDialog"
    @created="fetchMarkings"
  />
</template>

<style scoped>
</style>
