<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const route = useRoute()
const router = useRouter()

const productId = computed(() => Number(route.query.product_id || 0))
const sizeValue = computed(() => String(route.query.size || ''))
const usedFilter = computed<true | false | undefined>(() => {
  const raw = route.query.used
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return undefined
})

const loading = ref(false)
const errorMessage = ref('')
const rows = ref<ChzApiItem[]>([])
const productName = ref<string>('')

function prettyCode(code: string) {
  return code?.replace(/\u001d/g, ' ␟ ')
}

async function fetchAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    if (productId.value) {
      const { data, error } = await getProduct(productId.value)
      if (!error.value) productName.value = (data.value as any)?.name || `Товар #${productId.value}`
    }

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

    rows.value = agg.filter(it => {
      const okProduct = it.size?.product_id === productId.value
      const okSize = (it.size?.value || '') === sizeValue.value
      const okUsed = usedFilter.value === undefined ? true : it.used === usedFilter.value
      return okProduct && okSize && okUsed
    })
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || 'Ошибка загрузки меток'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

const headers = [
  { title: 'ID', key: 'id', width: 90 },
  { title: 'Код', key: 'code', sortable: false },
  { title: 'Создана', key: 'created_at', sortable: true },
]
</script>

<template>
  <VCard :title="`Метки — ${productName || ('Товар #' + productId)}`">
    <VDivider />
    <VCardText>
      <div class="d-flex justify-space-between align-center mb-4">
        <div class="text-medium-emphasis">
          Товар: <strong>{{ productName || ('#' + productId) }}</strong>
          <span v-if="sizeValue"> • Размер: <strong>{{ sizeValue }}</strong></span>
          <span v-if="usedFilter !== undefined"> • {{ usedFilter ? 'Использованные' : 'Неиспользованные' }}</span>
        </div>
        <VBtn variant="tonal" prepend-icon="tabler-arrow-left" @click="router.back()">Назад</VBtn>
      </div>

      <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>

      <VDataTableServer
        :headers="headers"
        :items="rows"
        :items-length="rows.length"
        :loading="loading"
        class="text-no-wrap"
      >
        <template #loading>
          <div class="d-flex justify-center pa-8">
            <VProgressCircular indeterminate size="40" />
          </div>
        </template>

        <template #item.code="{ item }">
          <span class="mono">{{ prettyCode(item.code) }}</span>
        </template>

  

        <template #item.created_at="{ item }">
          {{ new Date(item.created_at).toLocaleString() }}
        </template>


      </VDataTableServer>
    </VCardText>
  </VCard>
</template>
