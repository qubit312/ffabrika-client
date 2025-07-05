<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { computed, onMounted, ref } from 'vue';

export interface Product {
  id: number;
  order_id: number;
  client_id: number;
  parent_id: number | null;
  name: string;
  qty: number;
  color: string;
  size: string[];
  complect: number;
  delivered: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  children: Product[];
  services: Service[];
}

export interface Service {
  id: number;
  product_id: number;
}

const entityData = ref<Product[]>([])
const token = localStorage.getItem('access_token') || ''

const headers = [
  { title: 'Название', key: 'name', sortable: false },
  // { title: 'Категория', key: 'category' },
  // { title: 'Клиент', key: 'client' },
  { title: 'Цвет', key: 'color', sortable: false },
  { title: 'Количество', key: 'qty', sortable: false },
  { title: '', key: 'actions', sortable: false },
]

const searchQuery     = ref<string>('')
const isSearchFocused = ref<boolean>(false)

const itemsPerPage = ref<number>(10)
const page = ref<number>(1)
const sortBy = ref<string | undefined>()
const orderBy = ref<'asc' | 'desc' | undefined>()

const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

const fetchData = async () => {
  const { data, error } = await useApi<Product[]>('/api/products', {
    method: 'GET',
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  })
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }
  entityData.value = data.value
  console.log(entityData.value)
}

const deleteProduct = async (id: number) => {
  try {
    const { error } = await useApi(`/api/products/${id}`, {
      method: 'DELETE',
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    })
    if (error.value) throw error.value
    await fetchData()
  }
  catch (err: any) {
    console.error('Ошибка при удалении метки:', err)
  }
}

const entities = computed<Product[]>(() => entityData.value)
const totalEntities = computed<number>(() => entities.value.length)

onMounted(() => {
  fetchData()
})

const categoryLabels: Record<string, string> = {
  COMMON:                            'Общие',
  COSMETICS_AND_HOUSEHOLD_CHEMICALS: 'Косметика и бытовая химия',
  CLOTHES:                           'Одежда',
  FOOTWEAR:                          'Обувь',
  BOOKS:                             'Книги',
  TEXTILE_AND_ACCESSORIES:           'Текстиль и аксессуары',
  LEATHER:                           'Кожа',
  DISHES:                            'Посуда',
  GLASSES:                           'Стекло',
  PRODUCTS_FOR_ADULTS:               'Товары для взрослых',
  SOIL:                              'Почва',
  JEWELRY:                           'Ювелирные изделия',
  FOOD_AND_PET_SUPPLIES:             'Корма и товары для животных',
}

const getCategoryLabel = (code: string) => categoryLabels[code] || code

</script>

<template>
  <div>
    <!-- product -->
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
              <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- category -->
        <!-- <template #item.category="{ item }">
          <span class="text-body-1 text-high-emphasis">{{ getCategoryLabel(item.category) }}</span>
        </template> -->

        <!-- client -->
        <!-- <template #item.client="{ item }">
          <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-high-emphasis">{{ item.client.name }}</span>
          </div>
        </template> -->

        <!-- color -->
        <template #item.color="{ item }">
          <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-high-emphasis">{{ item.color }}</span>
          </div>
        </template>

        <!-- actions -->
        <template #item.actions="{ item }">
          <IconBtn>
            <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
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
                <!-- <VListItem
                  value="duplicate"
                  prepend-icon="tabler-copy"
                >
                  Дублировать
                </VListItem> -->
              </VList>
            </VMenu>
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
</template>

<style scoped>
  .development-note {
    margin-top: 4px;
    font-size: 0.9rem;
    color: grey;
  }
</style>
