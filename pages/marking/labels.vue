<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
      if (!error.value) productName.value = (data.value as any)?.name || `Товар #${productId.value}`
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
      <span class="v-card-title pa-0">Маркировка Честный Знак</span>
    </VCardText>
    <VDivider />
    <VCardText>
      <div class="d-flex justify-space-between align-start mb-4">
        <div class="text-medium-emphasis">
          Товар: <strong>{{ productName || ('#' + productId) }}</strong>
          <span v-if="sizeValue"> • Размер: <strong>{{ sizeValue }}</strong></span>
          <span v-if="usedFilter !== undefined"> • {{ usedFilter ? 'Использованные' : 'Неиспользованные' }}</span>
          <p>Количество <strong>{{totalEntities || ''}}</strong></p>
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

        <template #item.code="{ item }">
          <span class="mono hoverable pointer">{{ prettyCode(item.code) }}</span>
        </template>

        <template #item.used_at="{ item }">
          <span class="hoverable pointer">{{ new Date(item.used_at).toLocaleString() }}</span>
        </template>

        <template #item.used_by="{ item }">
          <span class="hoverable pointer">{{ item.used_by?.name || ''  }}</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="hoverable pointer">{{ new Date(item.created_at).toLocaleString() }}</span>
        </template>

        <template #item.created_by="{ item }">
          <span class="hoverable pointer">{{ item.created_by?.name || ''  }}</span>
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
