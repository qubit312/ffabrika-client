<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { getProductSizes } from '@/services/chz'
import { getProductsWithSizes } from '@/services/products'
import type { FilterRequest } from '@/types/filter'
import type { WbProduct } from '@/types/product'
import type { ProductSizeWithLabels } from '@/types/productSize'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

interface LabelData {
  id: number
  product_id: number;
  product_name: string;
  size_id: number;
  size_value: string;
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

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

const page = ref(1)
const itemsPerPage = ref(15)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' } | null>(null)

const selectedProduct = ref<WbProduct | null>(null)
const selectedSize = ref<ProductSizeWithLabels | null>(null)
const productOptions = ref<WbProduct[]>([])
const sizeOptions = ref<ProductSizeWithLabels[]>([])

const searchProductNameQuery = ref<string>('')
const searchBarcodeQuery = ref<string>('')
const totalEntities = ref<number>(0)

const pageRows = ref<LabelData[]>([])
const headers = [
  { title: 'Товар',      key: 'product_name', sortable: true },
  { title: 'Размер',     key: 'size_value',   sortable: true },
  { title: 'Баркод',     key: 'barcode',      sortable: true },
  { title: 'Всего ЧЗ',   key: 'total',        sortable: true },
  { title: 'Использ.',   key: 'used',         sortable: true },
  { title: 'Неиспольз.', key: 'unused',       sortable: true },
]

onMounted(fetchAllPages)

interface Filter {
  field: string;
  op: 'eq' | 'ne' | 'gt' | 'like';
  value: string | number | boolean | Array<string | number>;
}

interface FilterPayload {
  filters: Filter[];
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  page: number;
  per_page: number;
  group_by_size: boolean;
}

async function fetchAllPages() {
  loading.value = true
  errorMessage.value = ''
  const filterPayload: FilterPayload = {
    filters: [],
    sort_by: sortBy.value?.key || 'number',
    sort_dir: sortBy.value?.order || "asc",
    page: page.value,
    per_page: itemsPerPage.value,
    group_by_size: true
  }

  if (selectedSize.value) {
    filterPayload.filters.push({ field: 'size_id', op: 'eq', value: selectedSize.value.id });
  }

  if (searchBarcodeQuery.value) {
    filterPayload.filters.push({ field: 'barcode', op: 'like', value: searchBarcodeQuery.value });
  }

  try {
    const { data, error } = await useApi<ApiResponse>('/api/chestny-znak-labels/filters', {
      method: 'POST',
      body: filterPayload
    })

    pageRows.value = data.value.data
    totalEntities.value = data.value.meta.total_groups | pageRows.value.length 
  } catch (e: any) {
    errorMessage.value = 'Ошибка загрузки меток'
  } finally {
    loading.value = false
  }
}

async function fetchProducts() {
  const payload: FilterRequest = {
    filters: [],
    sort_by: 'name',
    sort_dir: 'asc',
  }
  
  if (searchProductNameQuery.value) {
    payload.filters?.push({
      group: 'or',
      filters: [
        { field: 'name', op: 'like', value: searchProductNameQuery.value },
      ]
    })
  }

  const { data, error } = await getProductsWithSizes(payload)
  if (error.value) {
    console.error('Ошибка при загрузке целевых товаров:', error.value)
    return
  }

  productOptions.value = data.value.data || []
}

watch(searchProductNameQuery, (val) => {
  if (val) {
    fetchProducts()
  }
})

watch(() => [selectedProduct.value], () => { 
  if(selectedProduct.value?.id) {
    sizeOptions.value = []
    fetchSizes(selectedProduct.value?.id)
  }
})

watch(() => [selectedSize.value, searchBarcodeQuery.value, page.value, itemsPerPage.value], () => {
  console.log(page.value)
  console.log(itemsPerPage.value)
  fetchAllPages()
})

async function fetchSizes(productId: number) {
  const { data, error } = await getProductSizes(productId)
  
  if (error.value) {
    console.error('Ошибка загрузки размеров:', error.value)
    return
  }
  sizeOptions.value = data.value.data
}

function onOptionsUpdate(options: any) {
  if (options.sortBy?.length > 0) {
    const s = options.sortBy[0]
    sortBy.value = { key: s.key, order: s.order }
  } else {
    sortBy.value = null
  }
}

function openLabels(productId: number, sizeId: number, sizeValue: string, used: boolean) {
  router.push({ path: '/marking/labels', query: { product_id: productId, size_id: sizeId, size: sizeValue, used: used ? 1 : 0 } })
}

</script>

<template>
  <VCard title="Честный знак">
    <VDivider />

    <VCardText>
      <div class="d-flex flex-wrap gap-3 mb-4">
        <VAutocomplete
          v-model="selectedProduct"
          v-model:search="searchProductNameQuery"
          :items="productOptions"
          :no-filter="true"
          item-value="id"
          item-title="name"
          clearable
          style="inline-size: 280px;"
          class="me-3"
          label="Товар"
          :return-object="true"
        />
        <VSelect
          v-model="selectedSize"
          :items="sizeOptions"
          item-title="value"
          item-value="id"
          label="Размер"
          clearable
          style="inline-size: 180px;"
          class="me-3"
          return-object
        >
          <template #no-data>
            <div class="d-flex align-center justify-space-between pa-2 ps-6">
            <span>
              {{ selectedProduct ? 'Ничего не найдено' : 'Выберете товар' }}
            </span>
          </div>
          </template>
        </VSelect>
        <VTextField
          v-model="searchBarcodeQuery"
          label="Баркод"
          clearable
          style="inline-size: 240px;"
        />
      </div>

      <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
        {{ errorMessage }}
      </VAlert>

      <VDataTableServer
        :headers="headers"
        :items="pageRows"
        :items-length="totalEntities"
        :items-per-page="itemsPerPage"
        :page="page"
        class="text-no-wrap"
        :loading="loading"
        @update:options="onOptionsUpdate"
        @update:page="val => (page = val)"
        @update:items-per-page="val => { itemsPerPage = val; page = 1 }"
      >
        <template #loading>
          <div class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate size="40" />
          </div>
        </template>

        <template #no-data>
          <div class="text-medium-emphasis text-center py-8">Данных не найдено</div>
        </template>

        <template #item.product_name="{ item }">
         <span class="pointer hoverable">
          <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }" class="text-primary">
            {{ item.product_name }}
          </RouterLink>
          </span>
        </template>

        <template #item.size_value="{ item }">
        <span class="pointer hoverable">
          {{ item.size_value || '—' }}
          </span>
        </template>

        <template #item.barcode="{ item }">
        <span class="pointer hoverable">
          {{ item.barcode || '—' }}</span>
        </template>

        <template #item.total="{ item }">
        <span class="pointer hoverable">
          <strong>{{ item.total }}</strong>
          </span>
        </template>

        <template #item.used="{ item }">
          <span class="text-high-emphasis pointer hoverable" @click="openLabels(item.product_id, item.size_id, item.size_value, true)">
            {{ item.used }}
          </span>
        </template>

        <template #item.unused="{ item }">
          <span class="text-high-emphasis pointer hoverable" @click="openLabels(item.product_id, item.size_id, item.size_value, false)">
            {{ item.unused }}
          </span>
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
</template>
