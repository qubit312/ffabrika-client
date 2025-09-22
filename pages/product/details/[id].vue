<script setup lang="ts">
import AppBreadcrumbs from '@/components/AppBreadcrumbs.vue'
import LabelManager from '@/components/LabelManager.vue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { getBrands } from '@/services/brands'
import { getProductMainImage } from '@/services/productImages'
import { createProduct, getProduct, getProductCategories, updateProduct } from '@/services/products'
import type { CreateWbProductDto, WbProduct } from '@/types/product'
import type { ProductSize, ProductSizeWithLabels } from '@/types/productSize'
import { useDebounce } from '@vueuse/core'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const primaryId = Number(idParam)
const mode = ref<'create' | 'edit' | 'view' >('create')
const isFormInitialized = ref(false)
const originalForm = ref<WbProduct | null>(null)
const mainImage = ref<string | null>(null)

const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)
const appliedLabels = ref<{ id: string; name: string; color: string }[]>([])

const { items: productCrumbs, fullTitle: productTitle } = useBreadcrumbs(
  'Товары',
  { name: 'product-list' },
  currentTitle,
  isCreate,
)

interface Category {
  id: number
  name: string
  parent: { id: number, name: string } | null
}

const productSize = ref<ProductSize>({
  id: 0,
  product_id: 0,
  value: '',
  tech_size: '',
  barcode: ''
})

const form = reactive<WbProduct>({
  id: 0,
  created_by: null,
  updated_by: null,
  name: '',
  color: '',
  article: '',
  vendor_code: '',
  composition: '',
  wb_category: null,
  client_id: null,
  brand_id: null,
  brand: null,
  created_at: new Date(),
  updated_at: new Date(),
  has_chestny_znak: false,
  sizes: []
})

function mapServerResponseToForm(serverData: any): void {
  form.id = serverData.id || 0;
  form.name = serverData.name || '';
  form.color = serverData.color || '';
  form.article = serverData.article || '';
  form.vendor_code = serverData.vendor_code || '';
  form.composition = serverData.composition || '';
  form.wb_category = serverData.wb_category || '';  
  form.client_id = serverData.client_id;
  form.brand_id = serverData.brand_id;
  form.brand = serverData.brand;
  form.created_by = serverData.created_by || '';
  form.updated_by = serverData.updated_by || '';
  form.created_at = serverData.created_at || '';
  form.updated_at = serverData.updated_at || '';
  form.has_chestny_znak = serverData.has_chestny_znak;

  originalForm.value = structuredClone(toRaw(form))
}
function onLabelsChanged(payload: { applied: any[]; appliedIds: string[]; library: any[] }) {
  appliedLabels.value = payload.applied
}
watch(form, (newVal, oldVal) => {
  if (mode.value === 'view' && isFormInitialized.value && primaryId > 0) {
    if (JSON.stringify(newVal) !== JSON.stringify(originalForm.value)) {
      mode.value = 'edit'
    }
  }
}, { deep: true })

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')
const loading = ref(true)

const getLabelId = (item: any) => Number(item?.labels?.[0]?.id ?? 0)
const goToMarking = () => {
  const labelId = getLabelId(item)
  router.push({ name: 'product-marking-id', params: { id: labelId } })
}

async function fetchProduct(id: number) {
  loading.value = true
  const { data, error } = await getProduct(id)

  if (error.value) {
    console.error('Ошибка при загрузке товара:', error.value)
    loading.value = false
    return
  }

  mode.value = 'view';
  mapServerResponseToForm(data.value)
  isFormInitialized.value = true
  loading.value = false
}

async function onSubmit() {
  loading.value = true

  if (!form.wb_category) {
    showSnackbar('Выберите клиента и категорию', false)
    loading.value = false
    return
  }

  const payload: CreateWbProductDto = {
    client_id: form.client_id,
    name: form.name,
    color: form.color,
    article: form.article,
    vendor_code: form.vendor_code,
    category_id: form.wb_category.id,
    composition: form.composition,
    has_chestny_znak: form.has_chestny_znak,
    brand_id: form.brand_id,
  }

  let data, error

  if (mode.value === 'edit') {
    ({ data, error } = await updateProduct(payload, primaryId))
  } else {
    ({ data, error } = await createProduct(payload))
  }

  if (error?.value) {
    console.error('Ошибка при сохранении товара:', error.value)
    showSnackbar('Сохранение не удалось', false)
    loading.value = false
    return
  }

  showSnackbar('Успешно сохранено', true)
  if (mode.value !== 'edit') {
    await router.push({ name: 'product-details-id', params: { id: data.value.id } })
  }

  loading.value = false
}

onMounted(async () => {
  fetchBrands()
  if (primaryId > 0) {
    await fetchProduct(primaryId)
    if (form.wb_category) categories.value.push(form.wb_category)
    const { data, error } = await getProductMainImage(primaryId)
    if (!error.value && data.value?.data) {
      mainImage.value = data.value.data.url
    }
  } else {
    await fetchCategories()
  }
  loading.value = false
})

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isSuccess) {
    snackColor.value = 'success'
  } else {
    snackColor.value = 'error'
  }
}

function cancelEdit() {
  if (originalForm.value) {
    Object.assign(form, structuredClone(toRaw(originalForm.value)))
    mode.value = 'view'
  }
}

const brandOptions = ref<{ label: string; value: number }[]>([])

async function fetchBrands() {
  loading.value = true

  const { data, error } = await getBrands()
  if (error.value) {
    console.error('Ошибка при загрузке брендов:', error.value)
    loading.value = false
    return
  }
  if (data.value) {
    brandOptions.value = data.value
  } else {
    brandOptions.value = []
    console.warn('data.value is null')
  }
  loading.value = false
}

const handleChildCall = (params: ProductSizeWithLabels) => {
  if (!params) {
    return
  }

  if (params.id == productSize.value.id) {
    productSize.value = params
  }
};

const searchCategory = ref<string>('')
const debouncedCategory = useDebounce(searchCategory, 400)
const categories = ref<Category[]>([])
const isLoading = ref<boolean>(false)
const error = ref<string | null>(null)

watch([form.wb_category], () => {
  if(form.wb_category) {
    searchCategory.value = form.wb_category.name || ''
  }
})

watch(debouncedCategory, () => {
  if (!searchCategory.value && form.wb_category) {
    searchCategory.value = form.wb_category.name
  }
  fetchCategories()
})

const fetchCategories = async () => {
  isLoading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()

    if (searchCategory.value.trim()) {
      params.append('search', searchCategory.value.trim())
    }

    const { data, error: apiError } = await getProductCategories(params)
    
    if (apiError?.value) {
      throw new Error(apiError.value)
    }

    categories.value = data.value?.data ?? []
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Ошибка загрузки категорий'
    console.error('[fetchCategories] Ошибка:', err)
    categories.value = []
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <AppBreadcrumbs :items="productCrumbs" class="mb-2" />
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{ mode === 'create' ? 'Вы создаете новый товар' : form.name }}
        </h4>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap"> 
        <VBtn
          v-if="form.id"
         
          variant="flat"
          color="primary"
          prepend-icon="tabler-barcode"
          @click="goToMarking"
        >
          Маркировка
        </VBtn>
        <VBtn v-if="mode === 'edit'" variant="outlined" color="primary" @click="cancelEdit">
          Отменить
        </VBtn>
        <VBtn v-if="mode !== 'edit'" variant="outlined" color="primary" @click="router.back()">
          Закрыть
        </VBtn>
        <VBtn v-if="mode != 'view'" color="primary" @click="onSubmit">
          Сохранить
        </VBtn>
      </div>
    </div>

    <VRow>
      <VCol md="3">
        <VCard
          class="d-flex flex-column align-center justify-center"
          style="height: 430px; width: 100%; overflow: hidden;"
        >
          <div v-if="mainImage" style="width: 100%;">
            <img 
              :src="mainImage" 
              alt="Фото товара" 
              style="width: 100%; height: auto; object-fit: contain;" 
            />
            <a v-if="form.article || null" :href="`https://www.wildberries.ru/catalog/${form.article}/detail.aspx`">Открыть на WB</a>
          </div>
          
          <div v-else class="d-flex flex-column align-center justify-center" style="height: 100%;">
            <VIcon size="40" color="grey">tabler-files</VIcon>
            <div class="text-h6 mt-2" style="color: grey;">
              Место под фотографию
            </div>
          </div>
        </VCard>
        <LabelManager :product-id="form.id || null" @changed="onLabelsChanged" />
      </VCol>

      <VCol md="9">
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.name" label="Название" outlined />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField v-model="form.color" label="Цвет" outlined />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  label="Артикул товара"
                  placeholder=""
                  v-model="form.article"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  label="Артикул продавца"
                  placeholder="112233445"
                  v-model="form.vendor_code"
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="form.brand_id"
                  :items="brandOptions"
                  item-title="name"
                  item-value="id"
                  label="Бренд"
                  placeholder="Выберите бренд"
                  clearable
                />
              </VCol>
              <VCol cols="6" md="6">
              </VCol>
              <VCol cols="6" md="6">
                <VSwitch
                  v-model="form.has_chestny_znak"
                  label="Нужна маркировка ЧЗ"
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <VCard class="mb-6 pa-6">
          <VRow>
            <VCol cols="6" md="6">
              <div class="mb-1">
                <VLabel class="text-body-2" style="color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));">Категория</VLabel>
                <VChip v-if="form.wb_category?.parent?.name" color="grey lighten-2" size="small" class="ms-2">
                  {{ form.wb_category?.parent?.name || '' }}
                </VChip>
              </div>
              <AppAutocomplete
                v-model="form.wb_category"
                v-model:search="searchCategory"
                :items="categories"
                :no-filter="true"
                item-title="name"
                item-value="id"
                return-object
                placeholder="Введите категорию"
              />
            </VCol>
            <VCol cols="6">
              <div class="mb-1">
                <VLabel class="text-body-2" style="color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));">Состав</VLabel>
              </div>
              <AppTextField
                placeholder="Хлопок 95%"
                v-model="form.composition"
              />
            </VCol>
          </VRow>
             
          <VCardText>
            <LabelVariantDetails
              v-if="form.id"
              :product="form"
              :name="form.name"
              labelId="0"
              @call-parent-method="handleChildCall"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VSnackbar
      v-model="snackbar"
      :timeout="3000"
      :color="snackColor"
      location="top right"
    >
      {{ snackMessage }}
    </VSnackbar>
  </div>
  <CustomLoading :loading="loading"/>
</template>

<style lang="scss" scoped>
</style>
