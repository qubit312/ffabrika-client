<script setup lang="ts">
import { useDebounce } from '@vueuse/core';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { getChestnyZnakLabels } from '~/services/chz';
import { getProduct } from '~/services/products';

type ChzApiItem = {
  id: number
  size_id: number
  code: string
  used: boolean
  created_at: string
  size?: { id: number; product_id: number; value: string; barcode: string }
}

type GroupRow = {
  product_id: number
  product_name: string
  size_value: string
  barcode: string
  created_minute: string
  used: boolean
  count: number
}

const loading = ref(false)
const errorMessage = ref('')

const allItems = ref<ChzApiItem[]>([])
const grouped = ref<GroupRow[]>([])

const filters = reactive<{
  productId?: number
  sizeValue?: string
  used?: boolean | null | undefined
  barcode?: string
}>({
  productId: undefined,
  sizeValue: undefined,
  used: undefined,
  barcode: '',
})

const debouncedBarcode = useDebounce(computed(() => filters.barcode?.trim() || ''), 300)

const sortBy = ref<{ key: string; order: 'asc' | 'desc' } | null>(null)
const page = ref(1)
const itemsPerPage = ref(15)

const productNameCache = new Map<number, string>()

function toMinuteISO(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  d.setSeconds(0, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

function formatDateTime(isoMinute: string) {
  const d = new Date(isoMinute)
  if (isNaN(d.getTime())) return isoMinute
  return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function ensureProductName(productId: number): Promise<string> {
  if (productNameCache.has(productId)) return productNameCache.get(productId)!
  const { data, error } = await getProduct(productId)
  if (error.value) {
    const fallback = `Товар #${productId}`
    productNameCache.set(productId, fallback)
    return fallback
  }
  const p = data.value as any
  const name = p?.name || `Товар #${productId}`
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
    const minute = toMinuteISO(it.created_at)
    const used = !!it.used
    const name = productNameCache.get(pid) ?? `Товар #${pid}`
    const key = `${pid}__${sizeVal}__${barcode}__${minute}__${used}`
    const row = map.get(key)
    if (row) row.count += 1
    else map.set(key, { product_id: pid, product_name: name, size_value: sizeVal, barcode, created_minute: minute, used, count: 1 })
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
  const source = filters.productId ? grouped.value.filter(r => r.product_id === filters.productId) : grouped.value
  const uniq = [...new Set(source.map(r => r.size_value).filter(Boolean))]
  return uniq.map(v => ({ title: v, value: v }))
})

const statusOptions = [
  { title: 'Неиспользованные', value: false },
  { title: 'Использованные', value: true },
]

const filteredRows = computed(() => {
  const usedFilter = (filters.used == null) ? undefined : filters.used 
  const barcodeQuery = debouncedBarcode.value.toLowerCase()

  return grouped.value.filter(r => {
    const okProduct = filters.productId ? r.product_id === filters.productId : true
    const okSize = filters.sizeValue ? r.size_value === filters.sizeValue : true
    const okUsed = usedFilter === undefined ? true : r.used === usedFilter
    const okBarcode = barcodeQuery ? (r.barcode?.toLowerCase().includes(barcodeQuery)) : true
    return okProduct && okSize && okUsed && okBarcode
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
    let v1: any
    let v2: any
    switch (key) {
      case 'product_name': v1 = r1.product_name; v2 = r2.product_name; break
      case 'size_value': v1 = r1.size_value; v2 = r2.size_value; break
      case 'barcode': v1 = r1.barcode; v2 = r2.barcode; break
      case 'count': v1 = r1.count; v2 = r2.count; break
      case 'created_minute': v1 = r1.created_minute; v2 = r2.created_minute; break
      case 'used': v1 = r1.used ? 1 : 0; v2 = r2.used ? 1 : 0; break
      default: v1 = (r1 as any)[key]; v2 = (r2 as any)[key]
    }
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
  { title: 'Товар',          key: 'product_name',   sortable: true },
  { title: 'Размер',         key: 'size_value',     sortable: true },
  { title: 'Баркод',         key: 'barcode',        sortable: true },
  { title: 'Количество',     key: 'count',          sortable: true },
  { title: 'Дата создания',  key: 'created_minute', sortable: true },
  { title: 'Использована',   key: 'used',           sortable: true },
]

function onOptionsUpdate(options: any) {
  if (options.sortBy?.length > 0) {
    const s = options.sortBy[0]
    sortBy.value = { key: s.key, order: s.order }
  } else {
    sortBy.value = null
  }
}

watch(() => [filters.productId, filters.sizeValue, filters.used, debouncedBarcode.value], () => {
  page.value = 1
})
</script>

<template>
  <VCard title="Честный знак — агрегированный список">
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
        <VSelect
          v-model="filters.used"
          :items="statusOptions"
          label="Статус"
          clearable
          style="inline-size: 220px;"
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
          <div class="text-medium-emphasis text-center py-8">
            Данных не найдено
          </div>
        </template>

        <template #item.product_name="{ item }">
          <span class="text-high-emphasis">{{ item.product_name }}</span>
        </template>

        <template #item.size_value="{ item }">
          {{ item.size_value || '—' }}
        </template>

        <template #item.barcode="{ item }">
          <span>{{ item.barcode || '—' }}</span>
        </template>

        <template #item.count="{ item }">
          <strong>{{ item.count }}</strong>
        </template>

        <template #item.created_minute="{ item }">
          {{ formatDateTime(item.created_minute) }}
        </template>

        <template #item.used="{ item }">
          <VChip :color="item.used ? 'error' : 'success'" size="small" variant="tonal">
            {{ item.used ? 'Да' : 'Нет' }}
          </VChip>
        </template>

        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="total"
          />
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>
</template>

