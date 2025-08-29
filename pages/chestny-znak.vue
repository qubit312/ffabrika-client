<script setup lang="ts">
import { useDebounce } from '@vueuse/core'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getChestnyZnakLabels } from '~/services/chz'
import { getProduct } from '~/services/products'

type ChzApiItem = {
  id: number
  size_id: number
  code: string
  used: boolean
  created_at: string
  size?: { id: number; product_id: number; value: string; barcode: string }
}

type GroupRow = {
  id: number           
  product_id: number
  product_name: string
  size_value: string
  barcode: string
  total: number
  used: number
  unused: number
}

const router = useRouter()

const loading = ref(false)
const errorMessage = ref('')

const allItems = ref<ChzApiItem[]>([])
const grouped = ref<GroupRow[]>([])

const filters = reactive<{ productId?: number; sizeValue?: string; barcode?: string }>({
  productId: undefined,
  sizeValue: undefined,
  barcode: '',
})

const debouncedBarcode = useDebounce(computed(() => filters.barcode?.trim() || ''), 300)

const page = ref(1)
const itemsPerPage = ref(15)

const sortBy = ref<{ key: string; order: 'asc' | 'desc' } | null>(null)

const productNameCache = new Map<number, string>()

async function ensureProductName(productId: number): Promise<string> {
  if (productNameCache.has(productId)) return productNameCache.get(productId)!
  const { data, error } = await getProduct(productId)
  const name = error.value ? `Товар #${productId}` : (data.value as any)?.name || `Товар #${productId}`
  productNameCache.set(productId, name)
  return name
}

async function buildGroups(items: ChzApiItem[]) {
  const ids = new Set<number>()
  items.forEach(i => { if (i.size?.product_id) ids.add(i.size.product_id) })
  await Promise.all([...ids].map(id => ensureProductName(id)))

  const map = new Map<string, GroupRow>()
  for (const it of items) {
    const pid = it.size?.product_id ?? 0
    const sizeVal = it.size?.value ?? ''
    const barcode = it.size?.barcode ?? ''
    const key = `${pid}__${sizeVal}__${barcode}`

    if (!map.has(key)) {
      map.set(key, {
        id: pid,
        product_id: pid,
        product_name: productNameCache.get(pid) ?? `Товар #${pid}`,
        size_value: sizeVal,
        barcode,
        total: 0,
        used: 0,
        unused: 0,
      })
    }
    const row = map.get(key)!
    row.total += 1
    if (it.used) row.used += 1
    else row.unused += 1
  }
  grouped.value = [...map.values()]
}

async function fetchAllPages() {
  loading.value = true
  errorMessage.value = ''
  try {
    const first = await getChestnyZnakLabels({ page: 1, per_page: 50 })
    if (first.error.value) throw first.error.value
    const firstResp = first.data.value as any
    const lastPage: number = firstResp?.last_page ?? 1

    const agg: ChzApiItem[] = [...(firstResp?.data ?? [])]
    const tasks: Promise<void>[] = []
    for (let p = 2; p <= lastPage; p++) {
      tasks.push((async () => {
        const { data, error } = await getChestnyZnakLabels({ page: p, per_page: 50 })
        if (!error.value) agg.push(...(data.value?.data ?? []))
      })())
    }
    await Promise.all(tasks)

    allItems.value = agg
    await buildGroups(agg)
    page.value = 1
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || 'Ошибка загрузки меток'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAllPages)

const productOptions = computed(() =>
  [...new Map(grouped.value.map(r => [r.product_id, { title: productNameCache.get(r.product_id) ?? `Товар #${r.product_id}`, value: r.product_id }])).values()]
)
const sizeOptions = computed(() => {
  const src = filters.productId ? grouped.value.filter(r => r.product_id === filters.productId) : grouped.value
  return [...new Set(src.map(r => r.size_value).filter(Boolean))].map(v => ({ title: v, value: v }))
})

const filteredRows = computed(() => {
  const bq = debouncedBarcode.value.toLowerCase()
  return grouped.value.filter(r => {
    const okProd = filters.productId ? r.product_id === filters.productId : true
    const okSize = filters.sizeValue ? r.size_value === filters.sizeValue : true
    const okBarcode = bq ? (r.barcode?.toLowerCase().includes(bq)) : true
    return okProd && okSize && okBarcode
  })
})

function compare(a: any, b: any) {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

const sortedRows = computed(() => {
  const rows = [...filteredRows.value]
  if (!sortBy.value) return rows
  const { key, order } = sortBy.value
  rows.sort((r1: any, r2: any) => {
    const v1 = (r1 as any)[key]
    const v2 = (r2 as any)[key]
    const res = compare(v1, v2)
    return order === 'desc' ? -res : res
  })
  return rows
})

const total = computed(() => sortedRows.value.length)
const pageRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return sortedRows.value.slice(start, start + itemsPerPage.value)
})

const headers = [
  { title: 'Товар',      key: 'product_name', sortable: true },
  { title: 'Размер',     key: 'size_value',   sortable: true },
  { title: 'Баркод',     key: 'barcode',      sortable: true },
  { title: 'Всего ЧЗ',   key: 'total',        sortable: true },
  { title: 'Использ.',   key: 'used',         sortable: true },
  { title: 'Неиспольз.', key: 'unused',       sortable: true },
]

function onOptionsUpdate(options: any) {
  if (options.sortBy?.length > 0) {
    const s = options.sortBy[0]
    sortBy.value = { key: s.key, order: s.order }
  } else {
    sortBy.value = null
  }
}

function openLabels(productId: number, sizeValue: string, used: boolean) {
  router.push({ path: '/marking/labels', query: { product_id: productId, size: sizeValue, used: used ? 1 : 0 } })
}

watch(() => [filters.productId, filters.sizeValue, debouncedBarcode.value], () => { page.value = 1 })
</script>

<template>
  <VCard title="Честный знак">
    <VDivider />

    <VCardText>
      <div class="d-flex flex-wrap gap-3 mb-4">
        <VSelect
          v-model="filters.productId"
          :items="productOptions"
          item-title="title"
          item-value="value"
          label="Товар"
          clearable
          style="inline-size: 280px;"
          class="me-3"
        />
        <VSelect
          v-model="filters.sizeValue"
          :items="sizeOptions"
          item-title="title"
          item-value="value"
          label="Размер"
          clearable
          style="inline-size: 180px;"
          class="me-3"
        />
        <AppTextField
          v-model="filters.barcode"
          placeholder="Введите баркод"
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
        :items-length="total"
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
          <RouterLink :to="{ name: 'marking-details-id', params: { id: item.id } }" class="text-primary">
            {{ item.product_name }}
          </RouterLink>
        </template>

        <template #item.size_value="{ item }">
          {{ item.size_value || '—' }}
        </template>

        <template #item.barcode="{ item }">
          <span>{{ item.barcode || '—' }}</span>
        </template>

        <template #item.total="{ item }">
          <strong>{{ item.total }}</strong>
        </template>

        <template #item.used="{ item }">
          <span class="text-high-emphasis cursor-pointer" @click="openLabels(item.product_id, item.size_value, true)">
            {{ item.used }}
          </span>
        </template>

        <template #item.unused="{ item }">
          <span class="text-high-emphasis cursor-pointer" @click="openLabels(item.product_id, item.size_value, false)">
            {{ item.unused }}
          </span>
        </template>

        <template #bottom>
          <TablePagination v-model:page="page" :items-per-page="itemsPerPage" :total-items="total" />
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>
</template>
