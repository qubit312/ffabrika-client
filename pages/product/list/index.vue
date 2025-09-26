<script setup lang="ts">
import LabelManager from '@/components/LabelManager.vue';
import { useCurrentClient } from '@/composables/useCurrentClient';
import { useDebounce } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { deleteProduct, getProductsWithSizes } from '../../../services/products';
import type { FilterRequest } from '../../../types/filter';
import type { WbProduct } from '../../../types/product';

const router = useRouter()

const entityData = ref<WbProduct[]>([])

type ProductSize = {
  barcode?: string
  value?: string
  available_count?: number
  cz?: boolean
  chestny_znak?: boolean
}

function hasChestnyZnak(p: any) {
  const sizes: ProductSize[] = p?.sizes || []
  return sizes.some(s =>
    (typeof s.available_count === 'number' && s.available_count > 0) ||
    s.cz === true || s.chestny_znak === true
  )
}

const headers = [
  { title: 'Товар', key: 'name' },
  { title: 'Категория WB', key: 'wb_category' },
  { title: 'Цвет', key: 'color' },
  { title: 'Размеры', key: 'sizes', sortable: false },
  { title: 'Ярлыки', key: 'badges', sortable: false },
  { title: 'Изменено', key: 'updated_at' },
  { title: 'Действия', key: 'actions', sortable: false },
]

const isLoading = ref(false)
const searchName = ref<string>('')
const debouncedQuery = useDebounce(searchName, 400)
const searchCategory = ref<string>('')
const debouncedCategory = useDebounce(searchCategory, 400)
const searchArticle = ref<string>('')
const debouncedArticle = useDebounce(searchArticle, 400) 

const deleteDialog = ref(false)
const selectedDeleteId = ref<number | null>(null)
const selectedDeleteDisplayValue = ref<string>('')
const { currentClientId } = useCurrentClient()

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

const itemsPerPage = ref<number>(25)
const page = ref<number>(1)
const serverTotal = ref<number>(0)

const getLabelId = (item: any) => Number(item?.labels?.[0]?.id ?? 0)

const goToMarking = (item: any) => {
  const labelId = getLabelId(item)
  router.push({ name: 'product-marking-id', params: { id: labelId } })
}

watch([debouncedQuery, debouncedArticle, debouncedCategory], () => {
  page.value = 1
  fetchProducts()
})

watch([page, itemsPerPage, currentClientId], () => {
  fetchProducts()
})

const fetchProducts = async () => {
  if (!currentClientId.value) {
    return;
  }

  isLoading.value = true

  const payload: FilterRequest = {
    filters: [],
    page: page.value,
    per_page: itemsPerPage.value,
    sort_by: sortBy.value?.key ?? 'name',
    sort_dir: sortBy.value?.order ?? 'asc',
  }

  if (searchCategory.value) {
    payload.filters?.push({ field: 'wb_category', op: 'like', value: searchCategory.value })
  }

  if (searchArticle.value) {
    payload.filters?.push({ field: 'article', op: 'like', value: searchArticle.value })
  }

  if (searchName.value) {
    payload.filters?.push({ field: 'name', op: 'like', value: searchName.value })
  }

  const { data, error } = await getProductsWithSizes(payload)
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }

  const resp = data.value
  entityData.value = resp?.data ?? []
  serverTotal.value = Number(resp?.total ?? 0)
  itemsPerPage.value = Number(resp?.per_page ?? itemsPerPage.value)
  page.value = Number(resp?.current_page ?? page.value)

  isLoading.value = false

  if (entityData.value.length === 0 && serverTotal.value > 0 && page.value > 1) {
    const maxPage = Math.max(1, Math.ceil(serverTotal.value / itemsPerPage.value))
    if (page.value > maxPage) {
      page.value = maxPage
      await fetchProducts()
    }
  }
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
  page.value = options.page
  itemsPerPage.value = options.itemsPerPage

  if (options.sortBy?.length > 0) {
    sortBy.value = options.sortBy[0]
  } else {
    sortBy.value = null
  }
  fetchProducts()
}

const entities = computed<WbProduct[]>(() => entityData.value)
const totalEntities = computed(() => serverTotal.value)
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

type ProductLabel = { id: string; name: string; color: string }

const LS_KEY_LIBRARY = 'labels:library'
const libCache = ref<ProductLabel[] | null>(null)

function readLibrary(): ProductLabel[] {
  if (libCache.value) return libCache.value
  try {
    libCache.value = JSON.parse(localStorage.getItem(LS_KEY_LIBRARY) || '[]') ?? []
  } catch {
    libCache.value = []
  }
  return libCache.value
}
function readAppliedIds(productId: number | 'new'): string[] {
  const key = `product:${productId}:labelsApplied`
  try { return JSON.parse(localStorage.getItem(key) || '[]') ?? [] }
  catch { return [] }
}
function getAppliedLabels(productId: number): ProductLabel[] {
  const lib = readLibrary()
  const dict = new Map(lib.map(l => [l.id, l]))
  return readAppliedIds(productId).map(id => dict.get(id)).filter(Boolean) as ProductLabel[]
}

const labelsDrawer = ref(false)
const labelsDrawerProductId = ref<number | null>(null)
const labelsRefreshTick = ref(0)

function openLabelsDrawer(pid: number) {
  labelsDrawerProductId.value = pid
  labelsDrawer.value = true
}


function onLabelsChanged(payload: { applied: Array<{ id: number; name: string; color?: string }>; appliedIds: number[]; library: any[] }) {
  libCache.value = null
  labelsRefreshTick.value++

  const pid = labelsDrawerProductId.value
  if (!pid) return

  const idx = entityData.value.findIndex(p => p.id === pid)
  if (idx === -1) return

  const prev = entityData.value[idx]
  const updated = { ...prev, tags: payload.applied }

  entityData.value.splice(idx, 1, updated)
}

function getWbCategoryName(category: {id: number, name: string} | null): string {
  if (!category) {
    return '';
  }
  return category ? category.name : '';
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
            v-model="searchName"
            placeholder="Введите название"
            style="inline-size: 200px;"
            class="me-3"
            clearable
          />
          <AppTextField
            v-model="searchCategory"
            placeholder="Введите категорию"
            style="inline-size: 200px;"
            class="me-3"
            clearable
          />
          <!-- <VSelect
            v-model="displayedCategory"
            :items="categoryOptions"
            item-title="label"
            item-value="value"
            label="Категория"
            clearable
            style="inline-size: 200px;"
            class="me-3"
            @update:modelValue="handleCategoryChange"
          /> -->
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
        :items="entities"
        :items-length="totalEntities"
        class="text-no-wrap product-table"
        :loading="isLoading"
        :items-per-page="itemsPerPage"
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
    
        <template #item.name="{ item }">
          <div class="prodcell d-flex align-start gap-3">
            <img
              v-if="item.main_image_url"
              :src="item.main_image_url"
              alt="Фото"
              class="prodcell__img"
            />
            <div class="d-flex flex-column">
              <div class="d-flex align-center gap-2">
                <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }" class="text-high-emphasis">
                  {{ item.name }}
                </RouterLink>
              </div>
              <div v-if="item.article" class="text-caption text-medium-emphasis mt-1">
                {{ item.article }}
              </div>
              <div class="mt-2 d-flex align-center gap-2">
                <VBtn
                  size="x-small"
                  density="compact"
                  variant="flat"
                  color="primary"
                  prepend-icon="tabler-barcode"
                  class="mark-btn"
                  @click="goToMarking(item)"
                >
                  Маркировка
                </VBtn>
              
                <VTooltip location="top" open-delay="120">
                  <template #activator="{ props }">
                    <img v-bind="props" src="/icons/wb-icon.svg" alt="WB" class="product-icon ms-2" />
                  </template>
                  <span>Товар с Wildberries</span>
                </VTooltip>
              
                <VTooltip v-if="hasChestnyZnak(item)" location="top" open-delay="120">
                  <template #activator="{ props }">
                    <img v-bind="props" src="/icons/chz.svg" alt="Честный знак" class="product-icon ms-2" />
                  </template>
                  <span>Есть «Честный знак» в размерах</span>
                </VTooltip>
              </div>
            </div>
          </div>
        </template>

        <template #item.wb_category="{ item }">
          <span>{{ getWbCategoryName(item.wb_category) }}</span>
        </template>

        <template #item.color="{ item }">
          <div class="d-flex flex-column">
            <span>{{ item.color }}</span>
          </div>
        </template>

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
                    <td v-if="item.has_chestny_znak">{{ size.available_count }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VTooltip>
          </div>
        </template>
    
        <template #item.badges="{ item }">
          <div class="d-flex flex-wrap align-center gap-2">
            <template v-for="tag in (item.tags || [])" :key="tag.id">
              <VChip
                class="chip-product"
                size="x-small"
                variant="outlined"
                :style="{ '--chip-color': tag.color || '#10bcd4' }"
                :title="tag.name"
              >
                {{ tag.name }}
              </VChip>
            </template>
          
            <IconBtn class="ms-1" @click="openLabelsDrawer(item.id)"
              :title="(item.tags?.length || 0) ? 'Изменить теги' : 'Добавить тег'">
              <VIcon :icon="(item.tags?.length || 0) ? 'tabler-pencil-plus' : 'tabler-plus'" />
            </IconBtn>
          </div>
        </template>

        <template #item.actions="{ item }">
          <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
            <IconBtn>
              <VIcon icon="tabler-edit" />
            </IconBtn>
          </RouterLink>

          <IconBtn class="ms-4" @click="openDeleteDialog(item.id, item.name)">
            <VIcon icon="tabler-trash" value="delete" />
          </IconBtn>
        </template>

        <template #item.updated_at="{ item }">
          <div class="d-flex flex-column">
            <span>{{ formatDate(item.updated_at) }}</span>
          </div>
        </template>

        <template #bottom>  
          <VCardText class="pt-2">
            <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
              <div class="d-flex align-center gap-2">
                <span>Записей на странице</span>
                <VSelect
                  v-model="itemsPerPage"
                  :items="[5, 10, 25, 50, 100]"
                  style="max-inline-size: 8rem;min-inline-size: 5rem;"
                />
              </div>

              <VPagination
                v-model="page"
                :total-visible="$vuetify.display.smAndDown ? 3 : 5"
                :length="Math.ceil(totalEntities / itemsPerPage)"
              />
            </div>
          </VCardText>
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

  <VNavigationDrawer
    v-model="labelsDrawer"
    location="right"
    temporary
    width="420"
    :scrim="true"
  >
    <div class="pa-4 d-flex align-center justify-space-between">
      <h6 class="text-h6 m-0">Теги товара</h6>
      <IconBtn @click="labelsDrawer = false">
        <VIcon icon="tabler-x" />
      </IconBtn>
    </div>
    <VDivider />

    <div class="pa-4">
      <LabelManager
        v-if="labelsDrawerProductId"
        :product-id="labelsDrawerProductId"
        @changed="onLabelsChanged"
      />
    </div>
  </VNavigationDrawer>
</template>

<style lang="scss">
.product-icon {
  inline-size: 22px;
  block-size: 22px;
  display: inline-block;
  vertical-align: middle;
  cursor: default;
}

.prodcell__img {
  inline-size: 48px;
  object-fit: cover;
  border-radius: 8px;
}

.mark-btn {
  min-height: 22px !important;
  height: 22px !important;
  padding: 0 8px !important;
  line-height: 22px !important;
  font-size: 12px !important;
  border-radius: 5px !important;
}

.product-table .v-data-table__td,
.product-table .v-data-table__th {
  padding-block: 10px !important; 
}

.chip-product {
  --chip-color: #10bcd4; 
  border-color: var(--chip-color) !important;
  color: var(--chip-color) !important;
  background-color: transparent !important;
  font-weight: 600;
  border-radius: 5px !important; 
  padding-inline: 10px !important;
  height: 26px !important;
  line-height: 26px !important;
  font-size: 12px !important;
}
</style>
