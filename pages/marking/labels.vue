<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProductMainImage } from '~/services/productImages'
import { getProduct } from '~/services/products'

type ChzApiItem = {
  id: number
  size_id: number
  code: string
  status: string
  used: boolean
  created_at: string
  created_by: { id: number; name: string }
  used_at: string
  used_by: { id: number; name: string }
  size?: { id: number; product_id: number; value: string; barcode: string }
}

const route = useRoute()
const router = useRouter()
const itemsPerPage = ref<number>(25)
const page = ref<number>(1)
const totalEntities = ref<number>(0)

const productId = computed(() => Number(route.query.product_id || 0))
const sizeId = computed(() => Number(route.query.size_id || 0))
const sizeValue = computed(() => String(route.query.size || ''))
const usedFilter = computed<true | false | undefined>(() => {
  const raw = route.query.used
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return undefined
})

const status = computed<'used' | 'available' | ''>(() => {
  const raw = route.query.used
  if (raw === '1' || raw === 'true') return 'used'
  if (raw === '0' || raw === 'false') return 'available'
  return ''
})

const productImage = ref<string | null>(null)
const isWbImport = ref<boolean>(false)
const hasChestnyZnakFlag = ref<boolean>(false)
const imageDialog = ref(false)
const imageDialogUrl = ref<string | null>(null)

function openImageDialog(url: string) {
  imageDialogUrl.value = url
  imageDialog.value = true
}

const loading = ref(false)
const errorMessage = ref('')
const rows = ref<ChzApiItem[]>([])
const productName = ref<string>('')

function prettyCode(code: string) {
  return code?.replace(/\u001d/g, ' ␟ ')
}

interface Filter {
  field: string;
  op: 'eq' | 'ne' | 'gt' | 'like';
  value: string | number | boolean | Array<string | number>;
}

interface LabelData {
  id: number
  product_id: number;
  product_name: string;
  size_value: string;
  size_id: number;
  barcode: string;
  total: number;
  used: number;
  unused: number;
}

interface MetaData {
  grouped_by: string;
  total_groups: number;
}

interface ApiResponse {
  data: LabelData[];
  meta: MetaData;
}

interface FilterPayload {
  filters: Filter[];
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  page: number;
  per_page: number;
  group_by_size: boolean;
}

watch([page, itemsPerPage], () => {
  fetchAll()
})

async function fetchAll() {
  loading.value = true
  errorMessage.value = ''
  try {
if (productId.value) {
  const { data, error } = await getProduct(productId.value)
  if (!error.value) {
    const prod = data.value as any
    productName.value = prod?.name || `Товар #${productId.value}`
    isWbImport.value = !!prod?.is_wb_import
    hasChestnyZnakFlag.value = !!prod?.has_chestny_znak

    const { data: imgData, error: imgError } = await getProductMainImage(productId.value)
    if (!imgError.value && imgData.value?.data?.url) {
      productImage.value = imgData.value.data.url
    }
  }
}


    const filterPayload: FilterPayload = {
      filters: [],
      sort_by: sortBy.value?.key || 'created_at',
      sort_dir: sortBy.value?.order || 'desc',
      page: page.value,
      per_page: itemsPerPage.value,
      group_by_size: false
    }

    if (sizeId.value) {
      filterPayload.filters.push({ field: 'size_id', op: 'eq', value: sizeId.value });
    }

    if (status.value) {
      filterPayload.filters.push({ field: 'status', op: 'eq', value: status.value });
    }

    const { data, error } = await useApi<ApiResponse>('/api/chestny-znak-labels/filters', {
      method: 'POST',
      body: filterPayload
    })
    if (data.value) {
      if (data.value.data && Array.isArray(data.value.data)) {
        rows.value = data.value.data as ChzApiItem[]
      }
      if (data.value.meta) {
        totalEntities.value = data.value.meta.total || rows.value.length
      }
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || 'Ошибка загрузки меток'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

const baseHeaders = [
  { title: 'ID', key: 'id', width: 90 },
  { title: 'Код', key: 'code', sortable: false },
]

const usedHeaders = [
  { title: 'Дата применения', key: 'used_at', sortable: true },
  { title: 'Применил', key: 'used_by', sortable: false },
]

const createdHeaders = [
  { title: 'Дата Создания', key: 'created_at', sortable: true },
  { title: 'Создал', key: 'created_by', sortable: false },
]

const headers = computed(() => {
  if (status.value === 'used') {
    return [...baseHeaders, ...usedHeaders, createdHeaders[0]]
  } else {
    return [...baseHeaders, ...createdHeaders]
  }
})

const sortBy = ref<{ key: string, order: 'asc' | 'desc' } | null>(null)
const onOptionsUpdate = (options: any) => {
  if (options.sortBy?.length > 0) {
    const field = options.sortBy[0]
    if (['used_at', 'created_at', 'id'].includes(field.key)) {
      sortBy.value = field
    } else {
      sortBy.value = null
    }
  } else {
    sortBy.value = null
  }

  fetchAll()
}

</script>

<template>
  <VCard>
    <VCardText>
        <div class="v-card-title pa-0 font-weight-bold">
          <span class="text-truncate">
            {{ status === 'used' ? 'Использованных маркировок - ' : 'Неиспользованных маркировок - ' }}
          </span>
          {{ totalEntities }}
      </div>
    </VCardText>
    <VDivider />
    <VCardText>
      <div class="d-flex justify-space-between align-start mb-4">
        <div class="d-flex  gap-4 align-start mb-4">
          <div class="prodcell__img-wrapper">
            <img
              v-if="productImage"
              :src="productImage"
              alt="Фото товара"
              class="prodcell__img cursor-pointer"
              @click="openImageDialog(productImage)"
            />
            <div v-else class="prodcell__img prodcell__img--placeholder">
              <VIcon icon="tabler-photo" size="26" />
            </div>
          </div>

          <div class="d-flex flex-column flex-grow-1">
            <div
              class="d-flex align-center gap-2 text-truncate hoverable"
              style="max-width: 420px;"
              :title="productName"
            >
              <RouterLink
                v-if="productId"
                :to="{ name: 'product-details-id', params: { id: productId } }"
                class="text-high-emphasis text-truncate text-h5"
              >
                {{ productName }}
              </RouterLink>
              <span v-else class="text-high-emphasis text-h5">
                {{ productName || ('Товар #' + productId) }}
              </span>
            </div>
          
            <div class="mt-1 text-caption text-medium-emphasis d-flex align-center flex-wrap gap-1">
              <template v-if="sizeValue">
                <span class="text-truncate  text-h5">Размер: {{ sizeValue }}</span>
              
              </template>
            
            </div>
          </div>

        </div>
        <div>
          <VBtn variant="tonal" prepend-icon="tabler-arrow-left" @click="router.back()">Назад</VBtn>
        </div>
      </div>

      <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>

      <VDataTableServer
        :headers="headers"
        :items="rows"
        :items-length="rows.length"
        :loading="loading"
        class="text-no-wrap"
        @update:options="onOptionsUpdate"
      >
        <template #loading>
          <div class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate size="40" />
          </div>
        </template>
        <template #item.id="{ item }">
          <span class="c-default">{{ (item.id) }}</span>
        </template>

        <template #item.code="{ item }">
          <span class="c-default">{{ prettyCode(item.code) }}</span>
        </template>

        <template #item.used_at="{ item }">
          <span class="c-default">{{ new Date(item.used_at).toLocaleString() }}</span>
        </template>

        <template #item.used_by="{ item }">
          <span class="c-default">{{ item.used_by?.name || ''  }}</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="c-default">{{ new Date(item.created_at).toLocaleString() }}</span>
        </template>

        <template #item.created_by="{ item }">
          <span class="c-default">{{ item.created_by?.name || ''  }}</span>
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
    </VCardText>
  </VCard>
  <VDialog
  v-model="imageDialog"
  transition="scale-transition"
  :scrim="true"
  @click:outside="imageDialog = false"
  class="image-dialog"
>
  <div
    class="d-flex justify-center align-center"
  >
    <transition name="zoom-fade">
      <div
        v-if="imageDialogUrl"
        class="position-relative"
        @click="imageDialog = false"
      >
        <IconBtn
          @click.stop="imageDialog = false"
          class="position-absolute close-btn"
          style="top: 12px; right: 12px; z-index: 2; color: black;"
        >
          <VIcon icon="tabler-x" />
        </IconBtn>

        <img
          :src="imageDialogUrl"
          alt="Фото товара"
          class="dialog-image"
        />
      </div>
    </transition>
  </div>
</VDialog>

</template>
