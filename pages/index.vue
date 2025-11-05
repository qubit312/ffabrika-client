<script setup lang="ts">
import { getChestnyZnakLabels } from '@/services/chz'
import { getProductsWithSizes } from '@/services/products'
import type { FilterRequest } from '@/types/filter'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type ChzApiItem = {
  id: number
  size_id: number
  code: string
  used: boolean
  created_at: string
  size?: { id: number; product_id: number; value: string; barcode: string; alt: string; }
}
type ProductLite = {
  id: number
  name: string
  article?: string
  color?: string
  updated_at?: string | Date
  sizes?: Array<{ barcode?: string; value?: string; available_labels_count?: number }>
}

const loading = ref(true)
const errorText = ref<string | null>(null)

const chzAll = ref<ChzApiItem[]>([])
const lastProducts = ref<ProductLite[]>([])
const productsTotal = ref(0)

const kpi = reactive({
  products: 0,
  labelsTotal: 0,
  usedTotal: 0,
  unusedTotal: 0,
  usedPct: 0,   
})

async function fetchChzAllPages() {
  const first = await getChestnyZnakLabels({ page: 1, per_page: 50 })
  if (first.error.value) throw first.error.value
  const firstResp: any = first.data.value
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
  chzAll.value = agg
}

async function fetchProducts() {
  const payload: FilterRequest = {
    page: 1, per_page: 8, sort_by: 'updated_at', sort_dir: 'desc', filters: [],
  }
  const { data, error } = await getProductsWithSizes(payload)
  if (error.value) throw error.value
  const resp: any = data.value
  productsTotal.value = Number(resp?.total ?? 0)
  lastProducts.value = (resp?.data ?? []).map((p: any) => ({
    id: p.id, name: p.name, article: p.article, color: p.color, updated_at: p.updated_at, sizes: p.sizes,
  }))
}

function buildKpi() {
  kpi.products = productsTotal.value
  kpi.labelsTotal = chzAll.value.length
  kpi.usedTotal = chzAll.value.filter(i => i.used).length
  kpi.unusedTotal = kpi.labelsTotal - kpi.usedTotal
  kpi.usedPct = kpi.labelsTotal > 0 ? Math.round((kpi.usedTotal / kpi.labelsTotal) * 100) : 0
}

const showMoreTimeline = ref(false)
const TIMELINE_COLLAPSED = 5
const latestChzAll = computed(() =>
  [...chzAll.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
)
const timelineItems = computed(() =>
  showMoreTimeline.value ? latestChzAll.value.slice(0, 12) : latestChzAll.value.slice(0, TIMELINE_COLLAPSED)
)
function statusLabel(u: boolean) {
  return u ? 'Использована' : 'Не использована'
}
function statusColor(u: boolean) {
  return u ? 'success' : 'warning'
}
function openMarkingForPair(productId?: number, sizeValue?: string, used?: boolean) {
  const query: Record<string, any> = {}
  if (productId) query.product_id = productId
  if (sizeValue) query.size = sizeValue
  if (typeof used === 'boolean') query.used = used ? 1 : 0
  router.push({ path: '/marking/labels', query })
}

function fmtDate(date: string | Date | undefined) {
  if (!date) return '—'
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm} ${hh}:${mi}`
}
function goProducts() { router.push({ name: 'product-list' }) }
function goMarking() { router.push({ name: 'client-list' }) }
function goRepricer() { router.push({ name: 'repricer-list' }) }
function goChZ() { router.push({ name: 'chestny-znak' }) }

onMounted(async () => {
  try {
    loading.value = true
    await Promise.all([fetchChzAllPages(), fetchProducts()])
    buildKpi()
  } catch (e: any) {
    console.error(e)
    errorText.value = e?.message || 'Ошибка загрузки данных'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="d-flex flex-column gap-6">
    <VAlert v-if="errorText" type="error" variant="tonal">{{ errorText }}</VAlert>

    <VCard>
      <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
        <div>
          <div class="text-h4 font-weight-medium">Добро пожаловать в FAST WMS 🚀</div>
          <div class="text-body-5 text-medium-emphasis mt-1">
            Управляйте товарами, ценами, маркировкой и честным знаком — всё в одном месте.
          </div>
        </div>
        <div class="d-flex gap-3 flex-wrap">
          <VBtn color="primary" prepend-icon="tabler-box" @click="goProducts">Товары</VBtn>
          <VBtn variant="tonal" color="success" prepend-icon="tabler-discount" @click="goRepricer">Репрайсер</VBtn>
          
          <VBtn variant="outlined" color="primary" @click="goChZ">
            <template #prepend>
              <VIcon icon="chz" />
            </template>
            Честный знак
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VRow>
      <VCol cols="12" md="3" sm="6">
        <VCard class="kpi-card">
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Всего товаров</div>
              <div class="text-h5 font-weight-bold mt-1">{{ kpi.products }}</div>
            </div>
            <VAvatar variant="tonal" color="primary"><VIcon icon="tabler-package" /></VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard class="kpi-card">
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Этикеток ЧЗ</div>
              <div class="text-h5 font-weight-bold mt-1">{{ kpi.labelsTotal }}</div>
            </div>
            <VAvatar variant="tonal" color="warning"><VIcon icon="tabler-tags" /></VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard class="kpi-card">
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Использовано</div>
              <div class="text-h5 font-weight-bold mt-1">{{ kpi.usedTotal }}</div>

            </div>
            <VAvatar variant="tonal" color="success"><VIcon icon="tabler-checks" /></VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="3" sm="6">
        <VCard class="kpi-card">
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Неиспользовано</div>
              <div class="text-h5 font-weight-bold mt-1">{{ kpi.unusedTotal }}</div>
            </div>
            <VAvatar variant="tonal" color="error"><VIcon icon="tabler-hourglass" /></VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" md="6" class="d-flex flex-column gap-6">
        <VCard>
          <VCardTitle class="text-h6">Использование этикеток ЧЗ</VCardTitle>
          <VDivider />
          <VCardText>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-body-2">Использовано</span>
              <span class="text-body-2">{{ kpi.usedTotal }}</span>
            </div>
            <VProgressLinear :model-value="kpi.usedPct" height="10" rounded />
            <div class="text-caption text-medium-emphasis mt-2">{{ kpi.usedPct }}% от общего числа</div>

            <VDivider class="my-4" />

            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-body-2">Неиспользовано</span>
              <span class="text-body-2">{{ kpi.unusedTotal }}</span>
            </div>
            <VProgressLinear :model-value="100 - kpi.usedPct" height="10" color="error" rounded />
            <div class="text-caption text-medium-emphasis mt-2">{{ 100 - kpi.usedPct }}% ждут печати</div>
          </VCardText>
        </VCard>

        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Последние товары</span>
            <VBtn size="small" variant="tonal" color="primary" @click="goProducts">Открыть список</VBtn>
          </VCardTitle>
          <VDivider />
          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th>Товар</th>
              
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-6"><VProgressCircular indeterminate /></td>
              </tr>
            
              <tr v-for="p in lastProducts" :key="p.id">
                <td class="font-weight-medium">{{ p.name }}</td>

                <td class="text-right">
                  <VBtn size="x-small" variant="text" color="primary"
                        :to="{ name: 'product-details-id', params: { id: p.id } }">
                    Открыть
                  </VBtn>
                </td>
              </tr>
            
              <tr v-if="!loading && lastProducts.length === 0">
                <td colspan="6" class="text-center py-6 text-medium-emphasis">Нет данных</td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard>
          <VCardTitle class="d-flex align-center justify-space-between">
            <span class="text-h6">Последние операции ЧЗ</span>
            <VBtn size="small" variant="tonal" color="primary" @click="goChZ">
              Открыть маркировку
            </VBtn>
          </VCardTitle>
          <VDivider />
          <VCardText>
            <div v-if="loading" class="d-flex justify-center py-6">
              <VProgressCircular indeterminate />
            </div>

            <VTimeline v-else density="compact" side="end" align="start">
              <VTimelineItem
                v-for="item in timelineItems"
                :key="item.id"
                :dot-color="statusColor(item.used)"
                :icon="item.used ? 'tabler-checks' : 'tabler-tag'"
              >
                <div class="d-flex align-start justify-space-between gap-4">
                  <div>
                    <div class="d-flex align-center gap-2">
                      <VChip :color="statusColor(item.used)" size="x-small" variant="tonal">
                        {{ statusLabel(item.used) }}
                      </VChip>
                      <span class="text-medium-emphasis text-caption">{{ fmtDate(item.created_at) }}</span>
                    </div>

                    <div class="mt-1">
                      <div class="text-body-2">
                        Товар id №{{ item.size?.product_id || '—' }}
                        · Размер: <strong>{{ item.size?.value || '—' }}</strong>
                        · Баркод: <span class="text-medium-emphasis">{{ item.size?.barcode || '—' }}</span>
                      </div>

                    </div>
                  </div>

                  <div class="mt-1">
                    <VBtn
                      size="x-small"
                      variant="text"
                      color="primary"
                      @click="openMarkingForPair(item.size?.product_id, item.size?.value, item.used)"
                    >
                      Открыть
                    </VBtn>
                  </div>
                </div>
              </VTimelineItem>
            </VTimeline>
          </VCardText>
          <VCardText v-if="!timelineItems.length">              
            <div  class="text-center text-medium-emphasis py-6">
              Операций ещё не было
            </div>
          </VCardText>
          <VCardActions class="justify-center">
          
            <VBtn
              v-if="latestChzAll.length > TIMELINE_COLLAPSED"
              variant="text"
              @click="showMoreTimeline = !showMoreTimeline"
            >
              {{ showMoreTimeline ? 'Свернуть' : 'Показать ещё' }}
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>

  </div>
</template>

<style scoped lang="scss">
.kpi-card { min-height: 112px; }

.v-row + .v-row {
    margin-top: -12px;
}
</style>
