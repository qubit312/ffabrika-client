<script setup lang="ts">
import { deleteStrategy, getStrategies, updateStrategy } from '@/services/pricingStrategies'
import type { PricingStrategy } from '@/types/pricingStrategy'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()


const strategies = ref<PricingStrategy[]>([])
const loading = ref(false)


// Поиск и фильтры
const search = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')

const statusItems = [
  { title: 'Все статусы', value: 'all' },
  { title: 'Активные', value: 'active' },
  { title: 'Приостановлены', value: 'paused' }
]

const typeItems = [
  { title: 'Все типы', value: 'all' },
  { title: 'Изменение скидок по времени', value: 'time_discount' },
]

// Заголовки таблицы
const headers = [
  { title: 'Название стратегии', key: 'name', sortable: true },
  { title: 'Тип', key: 'type', sortable: true },
  { title: 'Кол-во товаров', key: 'items_count', sortable: true },
  { title: 'Дата создания', key: 'created_at', sortable: true },
  { title: 'Статус', key: 'status', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]

const fetchStrategies = async () => {
  loading.value = true
  try {
    const { data } = await getStrategies({
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      type: typeFilter.value !== 'all' ? typeFilter.value : undefined,
    })
    strategies.value = data.value.data
  } finally {
    loading.value = false
  }
}

onMounted(fetchStrategies)

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    paused: 'warning',
  }
  return colors[status] || 'grey'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: 'Активна',
    paused: 'Приостановлена',
  }
  return texts[status] || status
}

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    time_discount: 'Смена скидок по времени',
  }
  return texts[type] || type
}

const formatDate = (date: string) => {
  if (date) {
    return new Date(date).toLocaleDateString('ru-RU')
  }
  return ''
}

const goToCreateStrategy = () => {
  router.push('/repricer/details/0')
}

const editStrategy = (strategy: any) => {
  router.push(`/repricer/details/${strategy.id}`)
}

const toggleStrategy = async (strategy: PricingStrategy) => {
  const newStatus = strategy.status === 'active' ? 'paused' : 'active'
  const { data } = await updateStrategy(strategy.id, { status: newStatus })
  strategy.status = data.value.status
}

const removeStrategy = async (strategy: PricingStrategy) => {
  if (!confirm(`Удалить стратегию "${strategy.name}"?`)) return
  await deleteStrategy(strategy.id)
  strategies.value = strategies.value.filter(s => s.id !== strategy.id)
}

const resetFilters = () => {
  search.value = ''
  statusFilter.value = 'all'
  typeFilter.value = 'all'
  fetchStrategies()
}
</script>

<template>
  <div>
    <VCard title="Организации">
    <VDivider />

    <div class="d-flex flex-wrap gap-4 ma-6">
      <div class="d-flex align-center">
        <AppTextField
          v-model="search"
          placeholder="Поиск по названию стратегии..."
          density="comfortable"
          style="inline-size: 240px;"
          hide-details
        />
        <VSelect
          class="ms-2"
          v-model="statusFilter"
          :items="statusItems"
          @change="fetchStrategies"
          placeholder="Статус"
          density="comfortable"
          style="inline-size: 200px;"
          hide-details
        />
        <VSelect
          class="ms-2"
          v-model="typeFilter"
          :items="typeItems"
          @change="fetchStrategies"
          placeholder="Тип стратегии"
          density="comfortable"
          style="inline-size: 200px;"
          hide-details
        />
        <div class="d-flex gap-4 flex-wrap align-center ms-2">
          <VBtn
            variant="tonal"
            block
            @click="resetFilters"
          >
            Сбросить
          </VBtn>
        </div>
      </div>
      <VSpacer />
      <div class="d-flex gap-4 flex-wrap align-center">
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="$router.push({ name: 'repricer-details-id', params: { id: 0 } })"
        >
          Добавить стратегию
        </VBtn>
      </div>
    </div>

    <VDivider class="mt-4" />

    <!-- Таблица стратегий -->
    <VCard>
      <VDataTable
        :headers="headers"
        :items="strategies"
        :search="search"
        :loading="loading"
        :items-per-page="10"
        class="elevation-1"
      >
        <template #loading>
          <div class="d-flex justify-center pa-8 align-center" style="min-height: 300px">
            <VProgressCircular indeterminate size="40" />
          </div>
        </template>

        <!-- Колонка названия -->
        <template #item.name="{ item }">
          <RouterLink :to="{ name: 'repricer-details-id', params: { id: item.id } }">
            <div class="d-flex align-center pointer hoverable">
              {{ item.name }}
            </div>
          </RouterLink>
        </template>

        <!-- Колонка статуса -->
        <template #item.status="{ item }">
          <VChip
            :color="getStatusColor(item.status)"
            size="small"
          >
            {{ getStatusText(item.status) }}
          </VChip>
        </template>

        <!-- Колонка типа -->
        <template #item.type="{ item }" >
          <div class="c-default">
            <span>{{ getTypeText(item.type) }}</span>
          </div>
        </template>

        <!-- Колонка товаров -->
        <template #item.items_count="{ item }">
          <div class="c-default">
            <span>{{ item.items_count }}</span>
          </div>
        </template>

        <!-- Колонка даты создания -->
        <template #item.created_at="{ item }">
            <div class="c-default">
            {{ formatDate(item.created_at || '') }}
            </div>
        </template>

        <!-- Колонка действий -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <VBtn
              icon
              size="small"
              variant="text"
              color="primary"
              @click="editStrategy(item)"
            >
                <VIcon icon="tabler-edit" size="small" />
            </VBtn>
            <VBtn
              icon
              size="small"
              variant="text"
              :color="item.status === 'active' ? 'warning' : 'success'"
              @click="toggleStrategy(item)"
            >
              <VIcon
                :icon="item.status === 'active' ? 'tabler-pause' : 'tabler-play'"
                size="small"
              />
            </VBtn>
            <VBtn
              icon
              size="small"
              variant="text"
              color="error"
              @click="removeStrategy(item)"
            >
              <VIcon icon="tabler-trash" size="small" />
            </VBtn>
          </div>
        </template>

        <!-- Пустое состояние -->
        <template #no-data>
          <div class="d-flex justify-center py-8 align-center" style="min-height: 300px">
            <div>
              <h3 class="text-h6 mb-2">Стратегии не найдены</h3>
              <p class="text-medium-emphasis mb-4">
                  Создайте свою первую стратегию переоценки
              </p>
              <VBtn color="primary" @click="goToCreateStrategy">
                  Создать стратегию
              </VBtn>
            </div>
          </div>
        </template>
        </VDataTable>
    </VCard>
    </VCard>
  </div>

</template>

<style scoped>
.repricer-page {
  max-width: 1200px;
  margin: 0 auto;
}

.gap-2 {
  gap: 8px;
}
</style>
