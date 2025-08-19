<script setup lang="ts">
import AppBreadcrumbs from '@/components/AppBreadcrumbs.vue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../../../composables/useApi'
import { categoryOptions } from '../../../constants/productCategories'
import { createProduct, getProduct, updateProduct } from '../../../services/products'
import { createProductSize, updateProductSize } from '../../../services/productSizes'
import type { CreateWbProductDto, WbProduct } from '../../../types/product'
import type { ProductSize } from '../../../types/productSize'

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const primaryId = Number(idParam)
const mode = ref<'create' | 'edit' | 'view' >('create')
const isFormInitialized = ref(false)
const originalForm = ref<WbProduct | null>(null)


const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)

const { items: productCrumbs, fullTitle: productTitle } = useBreadcrumbs(
  'Товары',
  { name: 'product-list' },
  currentTitle,
  isCreate,
)

const productSize = ref<ProductSize>({
  id: 0,
  product_id: 0,
  value: '',
  barcode: '',
  quantity: 0
})

const form = reactive<WbProduct>({
  id: 0,
  created_by: null,
  updated_by: null,
  name: '',
  color: '',
  article: '',
  composition: '',
  category: '',
  client_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  has_chestny_znak: false
})

const firstSizeBarcode = computed({
  get: () => {
    return form.productSizes?.[0]?.barcode ?? ''
  },
  set: val => {
    if (form.productSizes?.[0]) {
      form.productSizes[0].barcode = val
    }
  }
})

function mapServerResponseToForm(serverData: any): void {
  form.id = serverData.id || 0;
  form.name = serverData.name || '';
  form.color = serverData.color || '';
  form.article = serverData.article || '';
  form.composition = serverData.composition || '';
  form.category = serverData.category || '';
    
  form.client_id = serverData.client_id;
  form.created_by = serverData.created_by || '';
  form.updated_by = serverData.updated_by || '';
  form.created_at = serverData.created_at || '';
  form.updated_at = serverData.updated_at || '';
  form.has_chestny_znak = serverData.has_chestny_znak;
  const sizes = serverData.sizes;
  if (sizes) {
    form.productSizes = sizes
    productSize.value = Array.isArray(sizes) && sizes.length > 0 ? sizes[0] : null
  }
  originalForm.value = structuredClone(toRaw(form))
}

watch(form, (newVal, oldVal) => {
  if (mode.value === 'view' && isFormInitialized.value && primaryId > 0) {
    if (JSON.stringify(newVal) !== JSON.stringify(originalForm.value)) {
      mode.value = 'edit'
    }
  }
}, { deep: true })

const clientOptions = ref<{ label: string; value: number }[]>([])

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')
const loading = ref(true)

async function fetchClients() {
  loading.value = true
  const { data, error } = await useApi<{ data: { id: number; name: string }[]; total: number }>('/api/clients', {
    method: 'GET'
  })
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    loading.value = false
    return
  }
  if (data.value) {
    clientOptions.value = data.value.map(c => ({
      label: c.name,
      value: c.id,
    }))
  } else {
    clientOptions.value = []
    console.warn('data.value is null')
  }
  loading.value = false
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

  if (!form.client_id || !form.category) {
    showSnackbar('Выберите клиента и категорию', false)
    loading.value = false
    return
  }
  
  const payload: CreateWbProductDto = {
    client_id: form.client_id,
    name: form.name,
    color: form.color,
    article: form.article,
    category: form.category,
    composition: form.composition,
    has_chestny_znak: form.has_chestny_znak
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
  
  if (form.category === 'COMMON') {
    const result = await saveSingleSize(data.value.id)
    showSnackbar(result.message, result.success)

    if (!result.success) {
      loading.value = false
      return
    }
  }

  showSnackbar('Успешно сохранено', true)
  if (mode.value !== 'edit') {
    await router.push({ name: 'product-details-id', params: { id: data.value.id } })
  }

  loading.value = false
}

async function saveSingleSize(productId: number): Promise<{ success: boolean, message: string }> {
  const size = productSize.value 
  if (form.category !== 'COMMON' || (!size.id && !size.barcode)) {
    return { success: true, message: '' }
  }

  if (!form.category) {
    return { success: false, message: 'Выберите категорию' }
  }
  
  const payload = {
    product_id: productId,
    value: size.value || '',
    barcode: size.barcode || ''
  }
  
  let data, error

  if (mode.value === 'edit') {
    if (!size.id) {
      ({ data, error } = await createProductSize(payload))
    } else {
      ({ data, error } = await updateProductSize(size.id, payload))
    }
  } else {
    ({ data, error } = await createProductSize(payload))
  }

  if (error?.value) {
    console.error('Ошибка при сохранении размера:', error.value)
    return { success: false, message: 'Ошибка при сохранении размера' }
  }

  return { success: true, message: 'Размер успешно сохранён' }
}

onMounted(async () => {
  await fetchClients()
  if (primaryId > 0) {
    await fetchProduct(primaryId)
  }
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

function handlePlaceholderClick() {
  console.log('Заглушка: клик по загрузке изображения');
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
        <div class="text-body-1">Подробная информация о товаре</div>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap"> 
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
          style="height: 390px; border: 2px dashed #ccc; cursor: pointer;"
          @click="handlePlaceholderClick"
        >
          <VIcon size="40" color="grey">tabler-files</VIcon>
          <div class="text-h6 mt-2" style="color: grey;">
            Место под фотографию
          </div>
        </VCard>
      </VCol>

      <VCol md="9">
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="form.client_id"
                  :items="clientOptions"
                  item-title="label"
                  item-value="value"
                  label="Клиент"
                  placeholder="Выберите клиента"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="6">
                <AppSelect
                  v-model="form.category"
                  :items="categoryOptions"
                  item-title="label"
                  item-value="value"
                  label="Категория"
                  placeholder="Выберите категорию"
                  clearable
                />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="12" md="8">
                <AppTextField v-model="form.name" label="Название" outlined />
              </VCol>
              <VCol cols="4">
                <AppTextField
                  label="Артикул товара"
                  placeholder="FXSK123U"
                  v-model="form.article"
                />
              </VCol>
              <VCol cols="12" md="4">
                <AppTextField v-model="form.color" label="Цвет" outlined />
              </VCol>
              <VCol cols="12" md="4">
                <AppTextField
                  label="Состав"
                  placeholder="Хлопок 95%"
                  v-model="form.composition"
                />
              </VCol>
              <VCol cols="12" md="4">
                <AppTextField
                  v-if="form.category != 'CLOTHES'"
                  label="Баркод"
                  placeholder=""
                  v-model="productSize.barcode"
                />
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
        <VCard class="mb-6" v-if="form.id && form.category == 'CLOTHES'">
          <VCardText>
            <LabelVariantDetails
              v-if="form.id"
              :product="form"
              :name="form.name"
              labelId="0"
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
