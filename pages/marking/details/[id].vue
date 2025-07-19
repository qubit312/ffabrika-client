<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CustomLoading from '../../../components/CustomLoading.vue'
import DefectiveLabelModal from '../../../components/dialogs/DefectiveLabelModal.vue'
import SizeMappingModal from '../../../components/dialogs/SizeMappingModal.vue'
import { createLabel, getLabel, updateLabel } from '../../../services/labels'
import { getProduct, getProducts } from '../../../services/products'
import type { Label, ShortEntityParams } from '../../../types/label'

const route = useRoute()
const router = useRouter()
const mode = ref<'create' | 'edit' | 'view'>('create')
const entityId = Number(route.params.id as string)

const snackbar = ref<boolean>(false)
const snackMessage = ref<string>('')
const snackColor = ref<'success' | 'error'>('success')

const showSizeModal = ref<boolean>(false)
const csvFiles = ref<File[]>([])

const dropZoneRef = ref<HTMLDivElement>()
interface FileData { file: File; url: string }
const fileData = ref<FileData[]>([])

const onChange   = (cb: (files: File[] | null) => void) => {}
const useDropZone = (_el: any, _fn: any) => {}

function onDrop(files: File[] | null) {
  files?.forEach(file => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }
    fileData.value.push({
      file,
      url: URL.createObjectURL(file)
    })
  })
}

onChange(selected => onDrop(selected))
useDropZone(dropZoneRef, onDrop)

const markingData = ref<Label | null>(null)
const name = ref<string>('')

const loadedLabelCount      = ref<number>(0)
const newLabelCount         = ref<number | null>(null)
const showLoadLabelDialog   = ref<boolean>(false)
const isLowLoadedLabelCount = computed(() => loadedLabelCount.value < 10)
const showDefectiveModal    = ref(false)

const selectedProduct = ref<ShortEntityParams | null>(null)
const products = ref<ShortEntityParams[]>([])
const filteredProducts = ref<ShortEntityParams[]>([])

const searchProducts = (q: string) => {
  const query = (typeof q === 'string' ? q : '').trim().toLowerCase()
  if (!query) {
    filteredProducts.value = products.value
  } else {
    filteredProducts.value = products.value.filter(p =>
      (p.name ?? '').toLowerCase().includes(query)
    )
  }
}

function applyNewCount() {
  if (newLabelCount.value != null && newLabelCount.value >= 0) {
    loadedLabelCount.value    = newLabelCount.value
    showLoadLabelDialog.value = false
  }
}

const fetchProducts = async () => {
  const { data, error } = await getProducts()
  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }
  products.value = data.value || []
  filteredProducts.value = products.value
}

const fetchLabel = async (id: number) => {
  loading.value = true
  if (id <= 0) {
    mode.value = 'create'
    loading.value = false
    return
  }

  try {
    const { data, error } = await getLabel(id)
    if (error.value) {
      console.error('Ошибка при получении метки:', error.value)
      loading.value = false
      return
    }

    markingData.value = data.value || null
    if (markingData.value) {
      patchFormWithData(markingData.value)
      mode.value = 'edit'
    }
    loading.value = false
  } catch (e) {
    console.error('Непредвиденная ошибка:', e)
    loading.value = false
  }
}

async function patchFormWithData(data: Label) {
  name.value = data.name

  if (data.product?.id) {
    const match = products.value.find(p => p.id === data.product!.id)
    selectedProduct.value = match ?? { id: data.product.id, name: data.product.name }
  } else if (data.product_id) {
    try {
      const { data: prodData, error } = await getProduct(data.product_id)
      if (error.value) {
        console.error('Не удалось получить продукт по ID', error.value)
        selectedProduct.value = null
      } else {
        const prod = prodData.value
        const match = products.value.find(p => p.id === prod.id)
        selectedProduct.value = match ?? { id: prod.id, name: prod.name }
      }
    } catch (err) {
      console.error('Ошибка при загрузке продукта:', err)
      selectedProduct.value = null
    }
  } else {
    selectedProduct.value = null
  }
}


async function onSubmit() {
  loading.value = true
  const payload = {
    name: name.value,
    product_id: selectedProduct.value?.id ?? null,
  }

  try {
    let labelId: number = 0

    if (mode.value === 'edit' && markingData.value) {
      const { data, error } = await updateLabel(entityId, payload)
      if (error.value) throw error.value
      patchFormWithData(data.value.data)
    } else {
      const { data, error } = await createLabel(payload)
      if (error.value) throw error.value
      labelId = data.value.id
    }

    showSnackbar(mode.value === 'edit' ? 'Этикетка успешно обновлена!' : 'Этикетка успешно создана!', false)
    if (mode.value === 'create' && labelId) {
      await router.push({
        name:   'marking-details-id',
        params: { id: labelId }
      })
    }

  } catch (err: any) {
    console.error(err)
    showSnackbar('Ошибка при сохранении: ' + (err.message || err), true)
  }
  loading.value = false
}

function showSnackbar(message: string, isError: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isError) {
    snackColor.value = 'error'
  } else {
    snackColor.value = 'success'
  }
}

onMounted(async () => {
  await fetchProducts()
  if (entityId > 0) {
    await fetchLabel(entityId)
  }
})

function openDefective() {
  showDefectiveModal.value = true
}

function openSizeMappingModal() {
  if (csvFiles.value.length === 0) {
    showSnackbar('Пожалуйста, загрузите хотя бы один CSV-файл', true)
    return
  }
  showSizeModal.value = true
}

const loading = ref(false)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{
            mode === 'create'
              ? 'Вы создаете новую этикетку'
              : name
          }}
        </h4>

        <div class="text-body-1">Этикетки используемые для маркировки товаров</div>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap">
        <VBtn variant="tonal" color="secondary" @click="router.back()">Закрыть</VBtn>
        <VBtn color="primary" @click="onSubmit">Сохранить </VBtn>
        
      </div>
    </div>

    <VRow>
      <VCol md="8">
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <!-- <VCol cols="12" md="6">
                <AppAutocomplete
                  v-model="selectedProduct"
                  :items="filteredProducts"
                  item-title="name"
                  item-value="id"
                  searchable
                  clearable
                  return-object
                  label="Товар"
                  placeholder="Выберите товар"
                  @update:search="searchProducts"
                />
              </VCol> -->
              <VCol cols="12" md="6">
                <AppTextField
                  label="Название для этикетки"
                  placeholder="Введите название товара на этикетке"
                  v-model="name"
                />
              </VCol>
              <!-- <VCol cols="12" md="6">
                <VSwitch
                  class="mt-6"
                  v-model="has_chestny_znak"
                  label="Нужна маркировка ЧЗ"
                />
              </VCol> -->
            </VRow>
          </VCardText>
        </VCard>

        <VCard class="mb-6">
          <VCardText>
            <LabelVariantDetails
              :product="selectedProduct"
              :name="name"
              :labelId="entityId"
            />
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        md="4"
        cols="12"
      >
        <VCard class="mb-6" title="Принтер">
          <VCardText>
            <VCol cols="12">
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
          </VCardText>
        </VCard>

        <!-- Честный знак -->
        <VCard>
          <VCardTitle class="ma-2">
            <div class="d-flex justify-space-between align-center w-100">
              <span>Честный знак</span>
              
              <VMenu>
                <template #activator="{ props }">
                  <IconBtn v-bind="props">
                    <VIcon icon="tabler-dots-vertical" />
                  </IconBtn>
                </template>

                <VList>
                  <VListItem @click="openDefective">
                    <VListItemTitle>Бракованная этикетка</VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>
            </div>
          </VCardTitle>
          
          <div class="d-flex flex-column">
            <VCardText>
              <VFileInput
                accept=".csv,text/csv"
                label="Загрузить CSV файл"
                multiple
                v-model="csvFiles"
              />
              <VRow class="mt-4">
                <VCol cols="12" class="d-flex justify-end">
                  <VBtn
                    color="primary"
                    :disabled="csvFiles.length === 0"
                    @click="openSizeMappingModal"
                  >
                    Настроить соответствие размеров
                  </VBtn>
                </VCol>
              </VRow>
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

  <VSnackbar
    v-model="snackbar"
    :timeout="3000"
    :color="snackColor"
    location="top right"
  >
    {{ snackMessage }}
  </VSnackbar>

  <SizeMappingModal
    v-model="showSizeModal"
    :productId="markingData ? markingData.product_id : 0"
    :files="csvFiles"
  />

  <DefectiveLabelModal
    v-model="showDefectiveModal"
  />

  <CustomLoading :loading="loading"/>
</template>

<style lang="scss" scoped>
</style>
