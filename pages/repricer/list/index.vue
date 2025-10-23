<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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
  { title: 'Конкурентная', value: 'competitive' },
  { title: 'Маржинальная', value: 'margin' },
  { title: 'Правила', value: 'rules' },
]

// Заголовки таблицы
const headers = [
  { title: 'Название стратегии', key: 'name', sortable: true },
  { title: 'Тип', key: 'type', sortable: true },
  { title: 'Товаров', key: 'products', sortable: true },
  { title: 'Дата создания', key: 'created_at', sortable: true },
  { title: 'Статус', key: 'status', sortable: true },
  { title: 'Действия', key: 'actions', sortable: false },
]

// Моковые данные
const strategies = ref([
  {
    id: 1,
    name: 'Конкурентная переоценка',
    description: 'Слежение за ценами конкурентов',
    status: 'active',
    type: 'competitive',
    products: 245,
    created_at: '2024-01-15',
  },
  {
    id: 2,
    name: 'Маржинальная стратегия',
    description: 'Поддержание маржи 25%',
    status: 'paused',
    type: 'margin',
    products: 128,
    created_at: '2024-01-10',
  },
  {
    id: 3,
    name: 'Правила переоценки',
    description: 'Сезонное изменение цен',
    status: 'paused',
    type: 'rules',
    products: 0,
    created_at: '2024-01-20',
  },
  {
    id: 4,
    name: 'Автоматическая коррекция',
    description: 'Корректировка на основе спроса',
    status: 'active',
    type: 'competitive',
    products: 89,
    created_at: '2024-01-18',
  },
])

// Вспомогательные функции
const getStrategyColor = (type: string) => {
  const colors: Record<string, string> = {
    competitive: 'blue',
    margin: 'green',
    rules: 'orange',
  }
  return colors[type] || 'grey'
}

const getStrategyIcon = (type: string) => {
  const icons: Record<string, string> = {
    competitive: 'mdi-trending-up',
    margin: 'mdi-chart-areaspline',
    rules: 'mdi-cog',
  }
  return icons[type] || 'mdi-chart-line'
}

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
    competitive: 'Конкурентная',
    margin: 'Маржинальная',
    rules: 'Правила',
  }
  return texts[type] || type
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU')
}

// Методы
const goToCreateStrategy = () => {
  router.push('/repricer/create')
}

const editStrategy = (strategy: any) => {
  router.push(`/repricer/details/${strategy.id}`)
}

const toggleStrategy = (strategy: any) => {
  strategy.status = strategy.status === 'active' ? 'paused' : 'active'
}

const deleteStrategy = (strategy: any) => {
  const index = strategies.value.findIndex(s => s.id === strategy.id)
  if (index !== -1) {
    strategies.value.splice(index, 1)
  }
}

const resetFilters = () => {
  search.value = ''
  statusFilter.value = 'all'
  typeFilter.value = 'all'
}
</script>

<template>
  <div>
    <VCard title="Репрайсер">
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
          placeholder="Статус"
          density="comfortable"
          style="inline-size: 200px;"
          hide-details
        />
        <VSelect
          class="ms-2"
          v-model="typeFilter"
          :items="typeItems"
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
            :items-per-page="10"
            class="elevation-1"
        >
        <!-- Колонка названия -->
        <template #item.name="{ item }">
          <div class="d-flex align-center pointer hoverable">
            <RouterLink :to="{ name: 'repricer-details-id', params: { id: item.id } }">
              {{ item.name }}
            </RouterLink>
          </div>
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
          <div class="hoverable pointer">
            <span>{{ getTypeText(item.type) }}</span>
          </div>
        </template>

        <!-- Колонка товаров -->
        <template #item.products="{ item }">
          <div class="hoverable pointer">
            <span>{{ item.products }}</span>
          </div>
        </template>

        <!-- Колонка даты создания -->
        <template #item.created_at="{ item }">
            <div class="hoverable pointer">
            {{ formatDate(item.created_at) }}
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
              @click="deleteStrategy(item)"
            >
              <VIcon icon="tabler-trash" size="small" />
            </VBtn>
          </div>
        </template>

        <!-- Пустое состояние -->
        <template #no-data>
            <div class="text-center py-8">
            <VIcon
                icon="mdi-chart-line"
                size="64"
                color="grey-lighten-1"
                class="mb-4"
            />
            <h3 class="text-h6 mb-2">Стратегии не найдены</h3>
            <p class="text-medium-emphasis mb-4">
                Создайте свою первую стратегию переоценки
            </p>
            <VBtn color="primary" @click="goToCreateStrategy">
                Создать стратегию
            </VBtn>
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
