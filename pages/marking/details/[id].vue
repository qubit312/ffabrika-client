<script setup lang="ts">
import LabelVariantDetails from '@/components/LabelVariantDetails.vue'
import type { MarkingParams, ShortEntityParams } from '@types/marking'
import { onMounted, ref, computed } from 'vue'

// Моковые данные и клиенты
import { mockMarkings, clients } from '@/types/db/markings'

const route = useRoute()
const router = useRouter()
const { id: markingId } = route.params as { id: string }

const mode = ref<'create' | 'edit' | 'view'>('create')

const dropZoneRef = ref<HTMLDivElement>()
interface FileData { file: File; url: string }
const fileData = ref<FileData[]>([])
// Заглушка для диалога и Object URL
const onChange = (cb: (files: File[] | null) => void) => {}
const useObjectUrl = (file: File) => ref<string>('')
const useDropZone = (_: any, _fn: any) => {}

function onDrop(DroppedFiles: File[] | null) {
  DroppedFiles?.forEach(file => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }
    fileData.value.push({ file, url: '' })
  })
}
onChange(selected => selected && onDrop(selected))
useDropZone(dropZoneRef, onDrop)

// Хранилище данных
const markingData = ref<MarkingParams | null>(null)
const name = ref('')
const article = ref('')
const composition = ref('')
const selectedClient = ref<ShortEntityParams | null>(null)
const selectedCategory = ref('')
const color = ref('')
const size = ref('')
const barcode = ref('')
const needsChestnyZnakLabel = ref<boolean>(false)
const loadedLabelCount = ref<number>(0)
const showLoadLabelDialog = ref(false)
const newLabelCount = ref<number | null>(null)
const isLowLoadedLabelCount = computed(() => loadedLabelCount.value < 10)

function applyNewCount() {
  if (newLabelCount.value != null && newLabelCount.value >= 0) {
    loadedLabelCount.value = newLabelCount.value
    showLoadLabelDialog.value = false
  }
}

const patchFormWithData = (data: MarkingParams) => {
  name.value = data.name
  article.value = data.article
  composition.value = data.composition
  needsChestnyZnakLabel.value = data.needsChestnyZnakLabel
  selectedClient.value = data.client
  selectedCategory.value = data.category
  color.value = data.color
  size.value = data.size
  barcode.value = data.barcode
}

// Моковые операции вместо API
const markingsStore = ref<MarkingParams[]>(mockMarkings)
const fetchData = async (id: string) => {
  const record = markingsStore.value.find(m => m.id === +id) || null
  if (record) {
    markingData.value = record
    patchFormWithData(record)
    mode.value = 'edit'
  } else {
    mode.value = 'create'
  }
}

const clientOptions = ref<ShortEntityParams[]>(clients)
const searchClients = async (query: string) => {
  clientOptions.value = clients.filter(c => c.name.includes(query))
}

const onSubmit = async () => {
  if (!selectedClient.value) {
    alert('Пожалуйста, выберите клиента')
    return
  }
  const idValue = mode.value === 'edit' ? markingData.value!.id : Date.now()
  const payload: MarkingParams = {
    id: idValue,
    name: name.value,
    article: article.value,
    composition: composition.value,
    needsChestnyZnakLabel: needsChestnyZnakLabel.value,
    client: selectedClient.value,
    category: selectedCategory.value,
    color: color.value,
    size: size.value,
    barcode: barcode.value
  }
  if (mode.value === 'create') {
    markingsStore.value.push(payload)
  } else {
    const idx = markingsStore.value.findIndex(m => m.id === idValue)
    markingsStore.value[idx] = payload
  }
  router.back()
}

onMounted(() => {
  if (markingId) fetchData(markingId)
})
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{
            mode === 'create'
              ? 'Новая запись'
              : name
          }}
        </h4>

        <div class="text-body-1">
          Этикетки используемые для маркировки товаров
        </div>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap">
        <VBtn
          variant="tonal"
          color="secondary"
          @click="router.back()"
        >
          Закрыть
        </VBtn>
          <VBtn
            color="primary"
            @click="onSubmit"
          >
            Сохранить
          </VBtn>
      </div>
    </div>

    <VRow>
      <VCol md="8">
        <VCard
          class="mb-6"
          title="Подробности"
        >
          <VCardText>
            <VRow>
              <VCol cols="12">
                <AppTextField
                  label="Название"
                  placeholder="Введите название товара на этикетке"
                  v-model="name"
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField
                  label="Артикул товара"
                  placeholder="FXSK123U"
                  v-model="article"
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField
                  label="Состав"
                  placeholder="Хлопок 95%"
                  v-model="composition"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VCheckbox
                  v-model="needsChestnyZnakLabel"
                  label="Есть честный знак"
                />
              </VCol>
              <VCol cols="12" md="6">
                <div class="d-flex align-center">
                  <!-- Текст и значение -->
                  <span>
                    Кол-во этикеток в принтере:
                    <strong>{{ loadedLabelCount }}</strong>
                  </span>

                  <!-- Значок предупреждения -->
                  <VTooltip bottom>
                    <template #activator="{ props }">
                      <VIcon
                        v-if="isLowLoadedLabelCount"
                        v-bind="props"
                        icon="tabler-alert-circle"
                        class="ms-2 text-error"
                      />
                    </template>
                    <span>Мало этикеток в принтере</span>
                  </VTooltip>

                  <!-- Кнопка обновления -->
                  <VBtn
                    color="primary"
                    @click="showLoadLabelDialog = true"
                    size="small"
                    class="ms-6"
                  >
                    Обновить
                  </VBtn>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <VCard
          title="Варианты"
          class="mb-6"
        >
          <VCardText>
            <LabelVariantDetails
              :markingId="markingId"
              :name="name"
              :article="article"
              :composition="composition"
              :color="color"
              :size="size"
              :client="selectedClient"
            />
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        md="4"
        cols="12"
      >
        <VCard
          class="mb-6"
        >
          <VCardText>
            <AppAutocomplete
              v-model="selectedClient"
              :items="clientOptions"
              item-title="name"
              item-value="id"
              label="Клиент"
              placeholder="Введите для поиска"
              return-object
              clearable
              :filter="() => true"
              :searchable="true"
              @update:search="searchClients"
              class="mb-6"
            />

            <AppSelect
              placeholder="Выберите категорию"
              label="Категория"
              :items="['Посуда', 'Одежда', 'Игрушки']"
              v-model="selectedCategory"
              clearable
              class="mb-6"
            />

            <AppTextField
              label="Цвет"
              placeholder="Красный"
              v-model="color"
            />
          </VCardText>
        </VCard>

        <!-- Честный знак -->
        <VCard title="Честный знак" v-if="needsChestnyZnakLabel">
          <div class="d-flex flex-column">
            <VCardText>
              <VFileInput
                accept=".csv,text/csv"
                label="Загрузить CSV файл"
              />
            </VCardText>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VDialog v-model="showLoadLabelDialog" max-width="400">
    <VCard>
      <VCardTitle>Введите количество</VCardTitle>
      <VCardText>
        <VTextField
          v-model.number="newLabelCount"
          label="Количество"
          type="number"
          min="0"
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="showLoadLabelDialog = false">Отмена</VBtn>
        <VBtn color="primary" @click="applyNewCount">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
  .drop-zone {
    border: 2px dashed rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 6px;
  }
</style>
