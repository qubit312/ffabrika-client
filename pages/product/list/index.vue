<script setup lang="ts">
import { useDebounce } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { categoryOptions, getCategoryLabel } from '../../../constants/productCategories';
import { deleteProduct, getProductsWithSizes } from '../../../services/products';
import type { FilterRequest } from '../../../types/filter';
import type { WbProduct } from '../../../types/product';

const entityData = ref<WbProduct[]>([])

type ProductSize = {
  barcode?: string
  value?: string
  available_labels_count?: number
  cz?: boolean
  chestny_znak?: boolean
}

function hasChestnyZnak(p: any) {
  const sizes: ProductSize[] = p?.sizes || []
  return sizes.some(s =>
    (typeof s.available_labels_count === 'number' && s.available_labels_count > 0) ||
    s.cz === true || s.chestny_znak === true
  )
}

const headers = [
  { title: 'Название', key: 'name' },
  { title: 'Категория', key: 'category' },
  { title: 'Цвет', key: 'color' },
  { title: 'Размеры', key: 'sizes', sortable: false },
  { title: 'Изменено', key: 'updated_at' },
  { title: 'Действия', key: 'actions', sortable: false },
]

const isLoading = ref(false)
const searchQuery = ref<string>('')
const debouncedQuery = useDebounce(searchQuery, 400)
const searchArticle = ref<string>('')
const debouncedArticle = useDebounce(searchArticle, 400) 
// const clients = ref<Client[]>([])
const selectedClientId = ref<number>()
const selectedCategory = ref<string>()

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

watch(debouncedArticle, () => {
  fetchProducts()
})

// const fetchClients = async () => {
//   const { data, error } = await getClients()
  
//   if (error.value) {
//     console.error('Ошибка при загрузке клиентов:', error.value)
//     return
//   }

//   clients.value = data.value || []
// }

const fetchProducts = async () => {
  isLoading.value = true

  const payload: FilterRequest = {
    filters: [],
    sort_by: sortBy.value?.key ?? 'name',
    sort_dir: sortBy.value?.order ?? 'asc',
  }

  if(selectedClientId.value) {
    payload.filters?.push({ field: 'client_id', op: 'eq', value: selectedClientId.value })
  }

  if (selectedCategory.value) {
    payload.filters?.push({ field: 'category', op: 'eq', value: selectedCategory.value })
  }

  if (searchArticle.value) {
    payload.filters?.push({ field: 'article', op: 'like', value: searchArticle.value })
  }

  if (searchQuery.value) {
    payload.filters?.push({ field: 'name', op: 'like', value: searchQuery.value })
  }

  const { data, error } = await getProductsWithSizes(payload)
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

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const onOptionsUpdate = (options: any) => {
  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }

  fetchProducts()
}

const entities = computed<WbProduct[]>(() => entityData.value)
const totalEntities = computed<number>(() => entities.value.length)
// const displayedClientId = computed({
//   get() {
//     const id = selectedClientId.value;
//     const exists = clients.value.some(c => c.id === id);
//     return exists ? id : undefined;
//   },
//   set(value) {
//     selectedClientId.value = value;
//   }
// });

const displayedCategory = computed({
  get() {
    const value = selectedCategory.value;
    const exists = categoryOptions.some(c => c.value === value);
    return exists ? value : undefined;
  },
  set(value) {
    selectedCategory.value = value;
  }
});

onMounted(async () => {
  const savedClientId = localStorage.getItem('selectedProductClientId');
  if (savedClientId) {
    selectedClientId.value = JSON.parse(savedClientId);
  }

  const savedCategory = localStorage.getItem('selectedProductCategoryId');
  if (savedCategory) {
    selectedCategory.value = JSON.parse(savedCategory);
  }

  fetchProducts();
  // await fetchClients();
});

// const handleClientChange = (newValue) => {
//   localStorage.setItem('selectedProductClientId', JSON.stringify(newValue));
//   fetchProducts();
// };

const handleCategoryChange = (newValue) => {
  localStorage.setItem('selectedProductCategoryId', JSON.stringify(newValue));
  fetchProducts();
};

const visibleTooltipIndex = ref<number | null>(null)

function toggleTooltip(index: number) {
  visibleTooltipIndex.value = visibleTooltipIndex.value === index ? null : index
}

function formatDate(date: string | Date) {
  const d = new Date(date)

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${day}.${month} ${hours}:${minutes}`
}

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
          <!-- <VSelect
            v-model="displayedClientId"
            :items="clients"
            item-title="name"
            item-value="id"
            label="Клиент"
            clearable
            style="inline-size: 200px;"
            class="me-3"
            @update:modelValue="handleClientChange"
          /> -->
          <VSelect
            v-model="displayedCategory"
            :items="categoryOptions"
            item-title="label"
            item-value="value"
            label="Категория"
            clearable
            style="inline-size: 200px;"
            class="me-3"
            @update:modelValue="handleCategoryChange"
          />
          <AppTextField
            v-model="searchArticle"
            placeholder="Введите артикул"
            style="inline-size: 200px;"
            class="me-3"
            clearable
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
          <div class="d-flex flex-column">
            <div class="d-flex align-center gap-2">
              <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }" class="text-high-emphasis">
                {{ item.name }}
              </RouterLink>
            
              <VTooltip
                v-if="hasChestnyZnak(item)"
                location="top"
                open-delay="120"
              >
                <template #activator="{ props }">
                  <img
                    v-bind="props"
                    src="/icons/chz.svg"
                    alt="Честный знак"
                    class="chz-icon ms-2"
                  />
                </template>
                <span>Есть «Честный знак» в размерах</span>
              </VTooltip>
            </div>
          
            <div v-if="item.article" class="text-caption text-medium-emphasis mt-1">
              Артикул: {{ item.article }}
            </div>
          </div>
        </template>

        <!-- category -->
        <template #item.category="{ item }">
          <div class="d-flex flex-column">
              <span>{{ getCategoryLabel(item.category) }}</span>
          </div>
        </template>

        <!-- color -->
        <template #item.color="{ item }">
          <div class="d-flex flex-column">
              <span>{{ item.color }}</span>
          </div>
        </template>

        <!-- sizes -->
        <template #item.sizes="{ item, index }" >
          <div class="sizes-text">
            <VTooltip
              class="sizes-card"
              open-on-click
              :open-on-hover="false"
              :model-value="visibleTooltipIndex === index"
              location="right"
            >
              <template #activator="{ props }">
                <span
                  v-bind="props"
                  class="cursor-pointer"
                  @click="toggleTooltip(index)"
                >
                  {{ item.sizes?.map(size => size.value).join(', ') }}
                </span>
              </template>

              <VTable density="compact" class="text-no-wrap">
                <thead>
                  <tr>
                    <th style="font-weight: 700;">Баркод</th>
                    <th style="font-weight: 700;">Размер</th>
                    <th style="font-weight: 700;" v-if="item.has_chestny_znak">ЧЗ</th>
                  </tr>
                </thead>
                <tbody style="font-size: 14px;">
                  <tr v-for="size in item.sizes" :key="size.barcode">
                    <td>{{ size.barcode }}</td>
                    <td>{{ size.value }}</td>
                    <td v-if="item.has_chestny_znak">{{ size.available_labels_count }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VTooltip>
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

        <!-- color -->
        <template #item.updated_at="{ item }">
          <div class="d-flex flex-column">
              <span>{{ formatDate(item.updated_at) }}</span>
          </div>
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
  .sizes-card > .v-overlay__content {
    border: 2px solid rgb(115, 103, 240);
    background: none;
    padding: 0 !important;
    box-shadow: rgba(114, 103, 240, 0.17) 7px 6px 2px 1px;
  }
.chz-icon {
  inline-size: 16px;  
  block-size: 16px;
  display: inline-block;
  vertical-align: middle;
  cursor: default;    
}

</style>
