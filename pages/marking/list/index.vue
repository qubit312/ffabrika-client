<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { MarkingParams } from '@types/marking'
import { mockMarkings } from '@/types/db/markings'

const markingsData = ref<{ markings: MarkingParams[]; total: number }>({ markings: [], total: 0 })

const headers = [
  { title: 'Наименование', key: 'name' },
  { title: 'Категория', key: 'category' },
  { title: 'Клиент', key: 'client' },
  { title: 'Цвет', key: 'color' },
  { title: '', key: 'actions', sortable: false },
]

const selectedStatus = ref<string | undefined>()
const selectedCategory = ref<string | undefined>()
const selectedStock = ref<boolean | undefined>()
const searchQuery = ref<string>('')

const itemsPerPage = ref<number>(10)
const page = ref<number>(1)
const sortBy = ref<string | undefined>()
const orderBy = ref<'asc' | 'desc' | undefined>()

const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

const resolveCategory = (category: string) => {
  switch (category) {
    case 'Accessories': return { color: 'error', icon: 'tabler-device-watch' }
    case 'Home Decor': return { color: 'info', icon: 'tabler-home' }
    case 'Electronics': return { color: 'primary', icon: 'tabler-device-imac' }
    case 'Shoes': return { color: 'success', icon: 'tabler-shoe' }
    case 'Office': return { color: 'warning', icon: 'tabler-briefcase' }
    case 'Games': return { color: 'primary', icon: 'tabler-device-gamepad-2' }
  }
}

// Функция-заглушка для получения данных
const fetchMarkings = async () => {
  // TODO: заменить на реальный вызов API
  // пока возвращаем пустой массив
  markingsData.value = {
    markings: mockMarkings,
    total: mockMarkings.length
  }
}

// Функция-заглушка удаления
const deleteProduct = async (id: number) => {
  // TODO: заменить на реальный вызов API удаления
  console.log(`Удалить запись с id=${id}`)
  await fetchMarkings()
}

const markings = computed<MarkingParams[]>(() => markingsData.value.markings)
const totalMarkings = computed<number>(() => markingsData.value.total)

onMounted(() => {
  fetchMarkings()
})
</script>


<template>
  <div>
    <!-- marking -->
    <VCard
      title="Этикетки"
      class="mb-6"
    >
      <VDivider />

      <div class="d-flex flex-wrap gap-4 ma-6">
        <div class="d-flex align-center">
          <!-- Search  -->
          <AppTextField
            v-model="searchQuery"
            placeholder="Введите название"
            style="inline-size: 200px;"
            class="me-3"
          />
        </div>

        <VSpacer />
        <div class="d-flex gap-4 flex-wrap align-center">
          <AppSelect
            v-model="itemsPerPage"
            :items="[5, 10, 20, 25, 50]"
          />
          <!-- 👉 Export button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-upload"
          >
            Эскпорт
          </VBtn>

          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="$router.push({ name: 'marking-details-id', params: { id: 0 } })"
          >
            Добавить этикетку
          </VBtn>
        </div>
      </div>

      <VDivider class="mt-4" />

      <!-- 👉 Datatable  -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        show-select
        :items="markings"
        :items-length="totalMarkings"
        class="text-no-wrap"
        @update:options="updateOptions"
      >
        <!-- name  -->
        <template #item.name="{ item }">
          <div
            class="d-flex align-center gap-x-4"
            style="cursor: pointer;"
          >
            <VAvatar
              v-if="item.image"
              size="38"
              variant="tonal"
              rounded
              :image="item.image"
            />
            <div class="d-flex flex-column">
              <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- category -->
        <template #item.category="{ item }">
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
          <span class="text-body-1 text-high-emphasis">{{ item.category }}</span>
        </template>

        <!-- client -->
        <template #item.client="{ item }">
          <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-high-emphasis">{{ item.client.name }}</span>
          </div>
        </template>

        <!-- color -->
        <template #item.status="{ item }">
          <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-high-emphasis">{{ item.status }}</span>
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn>
            <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }">
              <VIcon icon="tabler-edit" />
            </RouterLink>
          </IconBtn>

          <IconBtn>
            <VIcon icon="tabler-dots-vertical" />
            <VMenu activator="parent">
              <VList>
                <VListItem
                  value="delete"
                  prepend-icon="tabler-trash"
                  @click="deleteProduct(item.id)"
                >
                  Удалить
                </VListItem>

                <VListItem
                  value="duplicate"
                  prepend-icon="tabler-copy"
                >
                  Дублировать
                </VListItem>
              </VList>
            </VMenu>
          </IconBtn>
        </template>

        <!-- pagination -->
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
</template>
