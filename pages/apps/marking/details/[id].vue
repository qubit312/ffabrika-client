<script setup lang="ts">
import LabelVariantDetails from '@/components/LabelVariantDetails.vue'
import type { ClientOption } from '@db/apps/clients/types'
import type { MarkingParams } from '@db/apps/markings/types'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const optionCounter = ref(1)
const mode = ref<'create' | 'edit' | 'view'>('create')

const dropZoneRef = ref<HTMLDivElement>()
interface FileData {
  file: File
  url: string
}
const fileData = ref<FileData[]>([])
const { onChange } = useFileDialog({ accept: 'image/*' })

function onDrop(DroppedFiles: File[] | null) {
  DroppedFiles?.forEach(file => {
    if (!file?.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }

    fileData.value.push({ file, url: useObjectUrl(file).value ?? '' })
  })
}

onChange(selectedFiles => {
  if (!selectedFiles) return
  for (const file of selectedFiles)
    fileData.value.push({ file, url: useObjectUrl(file).value ?? '' })
})

useDropZone(dropZoneRef, onDrop)

const markingData = ref<MarkingParams | null>(null)
const name = ref('')
const article = ref('')
const composition = ref('')
const selectedClient = ref<ClientOption | null>(null)
const selectedCategory = ref('')
const color = ref('')
const size = ref('')
const barcode = ref('')
const needsChestnyZnakLabel = ref<boolean>()

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

const fetchData = async (id: string) => {
  const { data, error } = await useApi<MarkingParams>(`/apps/marking/${id}`)
  if (data.value) {
    markingData.value = data.value
    patchFormWithData(data.value)
    mode.value = 'edit'
  } else {
    mode.value = 'create'
  }
}

onMounted(() => {
  const id = route.params.id as string | undefined
  if (id) fetchData(id)
  else mode.value = 'create'
})

const clientOptions = ref<ClientOption[]>([])
const searchClients = async (query: string) => {
  const { data } = await useApi<ClientOption[]>(
    createUrl('/apps/clients/search', { query: { q: query } })
  )
  if (data.value) clientOptions.value = data.value
}

const onSubmit = async () => {
  const payload: MarkingParams = {
    name: name.value,
    article: article.value,
    composition: composition.value,
    needsChestnyZnakLabel: needsChestnyZnakLabel.value ?? false,
    clientId: selectedClient.value?.id,
    category: selectedCategory.value,
    color: color.value,
    size: size.value,
    barcode: barcode.value,
  }

  if (mode.value === 'create') {
    await useApi('/apps/marking', { method: 'POST', body: payload })
  } else if (mode.value === 'edit') {
    await useApi(`/apps/marking/${route.params.id}`, { method: 'PUT', body: payload })
  }
}
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
            </VRow>
          </VCardText>
        </VCard>

        <!-- 👉 Variants -->
        <VCard
          title="Варианты"
          class="mb-6"
        >
          <!-- <VCardText>
            <VRow>
              <VCol cols="12" md="4" class="pb-0">
                <span class="text-body-1 font-weight-medium">Баркод</span>
              </VCol>
              <VCol cols="12" md="8" class="pb-0">
                <span class="text-body-1 font-weight-medium">Размер</span>
              </VCol>
            </VRow>

            <template
              v-for="i in optionCounter"
              :key="i"
            >
              <VRow>
                <VCol
                  cols="12"
                  md="4"
                >
                  <AppTextField
                    placeholder="4000000000007"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="8"
                  class="d-flex align-self-end"
                >
                  <AppTextField
                    placeholder="38"
                  />
                </VCol>
              </VRow>
            </template>

            <VBtn
              class="mt-6"
              prepend-icon="tabler-plus"
              @click="optionCounter++"
            >
              Добавить размер
            </VBtn>
          </VCardText> -->
        <VCardText>
          <LabelVariantDetails :markingId="route.params.id"/>
        </VCardText>
        </VCard>

        <!-- 👉 Media -->
        <VCard class="mb-6">
          <VCardItem>
            <template #title>
              Предпросмотр
            </template>
          </VCardItem>

          <VCardText>
          <div class="preview-container">
            <div style="margin-right: 24px;">
              <div class="label-box">
                <div class="label-header">
                  <span class="label-header-text">{{ name }}</span>
                </div>
                <div class="label-content">
                  <div class="label" style="width: 80%">
                    <div class="label-line">Артикул: {{ article }}</div>
                    <div class="label-line">Цвет: {{ color }}</div>
                  </div>

                  <div class="label" style="width: 20%">
                    <div class="label-size">{{ size }}</div>
                  </div>
                </div>
                <div class="label-content">
                  <div class="label">
                    <div class="label-line">{{ selectedClient?.name }}</div>
                    <div class="label-line">Состав: {{ composition || '' }}</div>
                  </div>                  
                </div>
                
                <div class="label-barcode-block">
                  <img
                    style="height: 15mm;"
                    alt="Штрихкод"
                    src="https://barcode.tec-it.com/barcode.ashx?data=123123123123&code=EAN13" />
                </div>
              </div>
            </div>

            <div v-if="needsChestnyZnakLabel">
              <div class="label-box">
                <div class="label-header">
                  <span class="label-header-text">{{ name }}</span>
                </div>
                <div class="label-content">
                  <div class="label left" style="width: 50%">
                    <img
                    style="height: 21mm; width: 21mm;"
                    alt="Штрихкод"
                    src="https://barcode.tec-it.com/barcode.ashx?data=01046605684903452152NnIRDZfTGMD%1D91EE11%1D92oeGgLmUSMbPtHc2xVZxqkcrYSXz6%2B2ADQ0H4ZUANOqw%3D&code=GS1DataMatrix&translate-esc=on&dmsize=Default" />
                  </div>
                  <div class="label right">
                    <div style="text-align: center;">
                      ЧЕСТНЫЙ ЗНАК
                    </div>

                    <div class="spacer">
                      <div style="text-align: center;">
                        {{name}}, цвет {{ color }}, размер {{size}}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 14px; font-weight: bold">1</span>
                </div>
                <div>
                  <span style="margin-right: 10px; font-size: 10px">01234567891011</span>
                  <span style="font-size: 10px">2NnIRDZfTGMDA</span>
                </div>
              </div>
            </div>
          </div>

          </VCardText>
        </VCard>
      </VCol>

      <VCol
        md="4"
        cols="12"
      >
        <!-- Основаня ифнормация -->
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
          <div class="d-flex flex-column gap-y-4">
            <VCardText>
              <DropZone />
            </VCardText>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style lang="scss" scoped>
  .drop-zone {
    border: 2px dashed rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 6px;
  }

  .preview-container {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .label-box {
    border-radius: 10px;
    color: #000;
    position: relative;
    width: 58mm;
    height: 40mm;
    border: 2px solid rgb(151, 151, 151);
    padding: 8px;
    background: #fff;
    font-family: Arial, sans-serif;
    font-size: 9px;
    line-height: 1.3;
    box-sizing: border-box;
  }

  .label-header {
    text-align: center;
    margin-bottom: 4px;
  }

  .label-header-text {
    font-weight: bold;
    font-size: 11px;
  }

  .label-content {
    display: flex;
    align-items: stretch;
  }

  .label {
    display: flex;
    flex-direction: column;
  }

  .label.left {
    width: 50%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .label.right {
    width: 50%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .label.right .spacer {
    display: flex;
    flex: 1;
    align-items: center;
  }

  .label-size {
    font-size: 18px;
    font-weight: bold;
  }

  .label-barcode-block {
    margin-top: 5px;
    text-align: center;
  }
</style>
