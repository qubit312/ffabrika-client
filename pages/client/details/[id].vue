<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CustomLoading from '../../../components/CustomLoading.vue'
import { categoryOptions } from '../../../constants/productCategories'
import { createClient, getClient, updateClient } from '../../../services/clients'
import { createProduct, deleteProduct, getProducts } from '../../../services/products'
import { createProductSize, updateProductSize } from '../../../services/productSizes'
import type { Client, CreateClientDto } from '../../../types/client'
import type { CreateWbProductDto, WbProduct } from '../../../types/product'
import type { CreateProductSizeDto, SizeItem } from '../../../types/productSize'

const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string | undefined
const primaryId = idParam ? Number(idParam) : 0
const mode = ref<'create' | 'edit' | 'view' >('create')

const loading = ref(false)
const isFormInitialized = ref(false)
const originalForm = ref<Client | null>(null)

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const sizeItems = ref<SizeItem[]>([
  { value: '', quantity: 0, barcode: '' }
])
interface ProductUI extends WbProduct {
  sizes: SizeItem[]
}

const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)

const { items: clientCrumbs, fullTitle: clientTitle } = useBreadcrumbs(
  'Клиенты',
  { name: 'client-list' },
  currentTitle,
  isCreate,
)

const savedProducts = ref<ProductUI[]>([])
const form = reactive<Client>({
  id: 0,
  name: '',
  type: '',
  phone: '',
  email: '',
  telegram: '',
  details: {
    notes: '',
    preferred_contact: ''
  },
  tin: '',
  psrn: '',
  account: '',
  wb_api_token: '',
  bank: '',
  correspondent_account: '',
  bic: '',
  legal_address: '',
  vat: '',
  created_at: '',
  updated_at: '',
  deleted_at: null,
})

function mapServerResponseToForm(serverData: any): void {
  form.id = serverData.id || 0;
  form.name = serverData.name || '';
  form.type = serverData.type || '';
  form.phone = serverData.phone || '';
  form.email = serverData.email || '';
  form.telegram = serverData.telegram || '';
  
  form.details = {
    notes: serverData.details?.notes || '',
    preferred_contact: serverData.details?.preferred_contact || ''
  };
  
  form.tin = serverData.tin || '';
  form.psrn = serverData.psrn || '';
  form.account = serverData.account || '';
  form.wb_api_token = serverData.wb_api_token || '';
  form.bank = serverData.bank || '';
  form.correspondent_account = serverData.correspondent_account || '';
  form.bic = serverData.bic || '';
  form.legal_address = serverData.legal_address || '';
  form.vat = serverData.vat || '';
  form.created_at = serverData.created_at || '';
  form.updated_at = serverData.updated_at || '';
  form.deleted_at = serverData.deleted_at || null;

  originalForm.value = structuredClone(toRaw(form))
}

watch(form, (newVal, oldVal) => {
  if (mode.value === 'view' && isFormInitialized.value && primaryId > 0) {
    if (JSON.stringify(newVal) !== JSON.stringify(originalForm.value)) {
      mode.value = 'edit'
    }
  }
}, { deep: true })

const productForm = reactive({
  name: '',
  color: '',
  article: '',
  composition: '',
  category: '',
  size: [] as string[],
  hasChestnyZnak: false
})

function buildSubmitPayload(form: Client): CreateClientDto {
  return {
    name: form.name,
    type: form.type,
    email: form.email,
    phone: form.phone,
    telegram: form.telegram,
    details: {
      notes: form.details.notes,
      preferred_contact: form.details.preferred_contact,
    },
    tin: form.tin,
    psrn: form.psrn,
    account: form.account,
    bank: form.bank,
    wb_api_token: form.wb_api_token,
    correspondent_account: form.correspondent_account,
    bic: form.bic,
    legal_address: form.legal_address,
    vat: form.vat,
  }
}

async function saveProduct() {
  loading.value = true
  const payload: CreateWbProductDto = {
    client_id: primaryId,
    name:      productForm.name,
    color:     productForm.color,
    article:     productForm.article,
    composition:     productForm.composition,
    category:     productForm.category,
    has_chestny_znak: productForm.hasChestnyZnak,
  }
  const response = await createProduct(payload)

  const { data, error } = response

  if (error.value) {
    snackColor.value = 'error'
    snackMessage.value = 'Не удалось сохранить товар'
  } else {
    snackColor.value = 'success'
    snackMessage.value = 'Товар создан'

    const prod = data.value
    savedProducts.value.push(prod)

    for (const si of sizeItems.value) {
      await saveSize(si, prod.id)
    }

    resetProductForm()
  }

  snackbar.value = true
  loading.value = false
}

async function saveSize(item: SizeItem, productId: number) {
  try {
    const dto: CreateProductSizeDto = {
      product_id: productId,
      value:      item.value,
      barcode:    item.barcode,
    }

    let response
    if (item.id) {
      response = await updateProductSize(item.id, dto)
    } else {
      response = await createProductSize(dto)
    }

    const { data, error } = response
    if (error.value) throw error.value

    item.id = data.value.id
  } catch (e) {
    console.error('Ошибка сохранения варианта размера:', e)
  }
}

async function fetchClient(id: number) {
  loading.value = true
  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    mode.value = 'view';
    mapServerResponseToForm(data.value.data)
    isFormInitialized.value = true
  }
  loading.value = false
}

async function fetchProducts() {
  loading.value = true
  const { data, error } = await getProducts(primaryId)

  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
  } else {
    const list: ProductUI[] = (data.value ?? []).map(prod => {
      return {
        ...prod,
        sizes: []
      }
    })

    savedProducts.value = list
  }

  loading.value = false
}

async function onSubmit() {
  loading.value = true
  const dto = buildSubmitPayload(form) as CreateClientDto

  const response = mode.value === 'edit'
    ? await updateClient(primaryId, dto)
    : await createClient(dto)

  const { data, error } = response

  if (error.value) {
    snackColor.value   = 'error'
    snackMessage.value = 'Ошибка сохранения клиента'
  } else {
    snackColor.value   = 'success'
    snackMessage.value = mode.value === 'edit'
      ? 'Клиент обновлён'
      : 'Клиент создан'

    if (mode.value === 'edit') {
      originalForm.value = structuredClone(toRaw(form))
      mode.value = 'view'
    }

    if (mode.value === 'create') {
      const newId = data.value.data.id
      router.push({ name: 'client-details-id', params: { id: newId } })
    }
  }

  snackbar.value = true
  loading.value = false
}

async function handleDelete(id: number) {
  loading.value = true

  try {
    const { error } = await deleteProduct(id)
    if (error.value) throw error.value

    const idx = savedProducts.value.findIndex(p => p.id === id)
    if (idx !== -1) savedProducts.value.splice(idx, 1)

    snackColor.value   = 'success'
    snackMessage.value = 'Товар удалён'
  }
  catch (err) {
    console.error('Ошибка при удалении товара:', err)
    snackColor.value   = 'error'
    snackMessage.value = 'Не удалось удалить товар'
  }
  finally {
    snackbar.value   = true
    loading.value  = false
  }
}

onMounted(() => {
  if (primaryId > 0) {
    fetchClient(primaryId)
    fetchProducts()
  }
})

const productHeaders = [
  { title: 'Название', key: 'name', sortable: false},
  { title: 'Артикул', key: 'article', sortable: false },
  { title: 'Цвет', key: 'color', sortable: false},
  { key: 'actions', sortable: false },
]

function resetProductForm() {
  productForm.name = ''
  productForm.color = ''
  productForm.article = ''
  productForm.composition = ''
  productForm.category = ''
  productForm.hasChestnyZnak = false
  productForm.size = [] 
  sizeItems.value = [
    { value: '', quantity: 0, barcode: '' }
  ]
}

function cancelEdit() {
  if (originalForm.value) {
    Object.assign(form, structuredClone(toRaw(originalForm.value)))
    mode.value = 'view'
  }
}

const addSize = () => {
  sizeItems.value.push({ value: '', quantity: 0, barcode: '' })
}

const removeSize = (idx: number) => {
  if (sizeItems.value.length > 1) {
    sizeItems.value.splice(idx, 1)
  }
}

const importResult = reactive({
  show: false,
  success: false,
  total_processed: 0,
  created: 0,
  updated: 0,
  errors: [] as string[]
})

const importProductsFromWb = async () => {
  try {
    loading.value = true
    const { data, error } = await useApi<any>(`/api/wb/test?client_id=${primaryId}`, {
      method: 'POST',
    })

    if (error.value) {
      throw new Error(error.value.message || 'Ошибка при импорте товаров')
    }

    if (data.value) {
      Object.assign(importResult, {
        show: true,
        success: data.value.success,
        total_processed: data.value.total_processed || 0,
        created: data.value.created || 0,
        updated: data.value.updated || 0,
        errors: data.value.errors || []
      })
      
      // Обновляем список товаров после успешного импорта
      await fetchProducts()
    }
  } catch (e) {
    Object.assign(importResult, {
      show: true,
      success: false,
      errors: [e instanceof Error ? e.message : 'Неизвестная ошибка']
    })
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div>
   <AppBreadcrumbs :items="clientCrumbs" class="mb-2" />
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{ mode === 'create' ? 'Вы создаете нового клиента' : form.name }}
        </h4>
        <div class="text-body-1">Детальная информация о клиенте</div>
      </div>
      <div class="d-flex gap-4 align-center flex-wrap"> 
        <VBtn v-if="primaryId" color="primary" @click="importProductsFromWb">
          Импортировать товары с WB
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
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="12" md="12">
                <AppTextField v-model="form.name" label="Название" placeholder="Введите название клиента" outlined />
              </VCol>
              <VCol cols="12" md="12">
                <AppSelect
                  v-model="form.type"
                  :items="typeOptions"
                  item-title="label"
                  item-value="value"
                  label="Тип клиента"
                  placeholder="Выберите тип"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="12" md="12">
                <AppTextField v-model="form.phone" label="Телефон" outlined />
              </VCol>
              <VCol cols="12" md="12">
                <AppTextField v-model="form.email" label="Email" outlined />
              </VCol>
              <VCol cols="12" md="12">
                <AppTextField v-model="form.telegram" label="Telegram" placeholder="@username" outlined />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>
      <VCol md="9">
        <VCard class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.tin" label="ИНН" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.psrn" label="ОГРНИП" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.account" label="Счёт" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.bank" label="Банк" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.correspondent_account" label="Корр. счёт" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.bic" label="БИК" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.vat" label="НДС" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.legal_address" label="Юридический адрес" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="form.wb_api_token" label="Токен WB API" outlined />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
        <VCard title="Товары" class="mb-6">
          <VCardText>
            <VRow>
              <VCol cols="4">
                <VTextField v-model="productForm.name" label="Название" />
              </VCol>
              <VCol cols="4">
                <VTextField v-model="productForm.color" label="Цвет" />
              </VCol>
              <VCol cols="4">
                <VTextField v-model="productForm.composition" label="Состав" />
              </VCol>
              <VCol cols="4">
                <VTextField v-model="productForm.article" label="Артикул" />
              </VCol>
              <VCol cols="4">
                <VSelect
                  v-model="productForm.category"
                  :items="categoryOptions"
                  label="Категория"
                  item-title="label"
                  item-value="value"
                  class="mb-6" 
                  :menu-props="{
                    maxHeight: 200,
                    location: 'bottom',
                    offset: 2,
                    persistent: true
                  }"
                />
              </VCol>
              <VCol cols="4">
                <VSwitch
                  v-model="productForm.hasChestnyZnak"
                  label="Нужна маркировка ЧЗ"
                />
              </VCol>
            </VRow>

            <VDivider class="my-4" />

          <div v-for="(item, i) in sizeItems" :key="i">
            <VRow class="align-center">
              <VCol cols="4">
                <VTextField v-model="item.barcode" label="Баркод" />
              </VCol>
              <VCol cols="3">
                <VTextField v-model="item.value" label="Размер" />
              </VCol>
              <VCol cols="2" class="d-flex justify-center">
                <VBtn class="me-4" icon color="primary" @click="addSize">
                  <VIcon size="20" icon="tabler-plus" />
                </VBtn>
                <VBtn
                  icon
                  color="error"
                  @click="removeSize(i)"
                  v-if="sizeItems.length > 1"
                >
                  <VIcon size="20" icon="tabler-trash" />
                </VBtn>
              </VCol>
            </VRow>
          </div>

            <!-- Кнопки сохранения -->
            <VRow class="justify-end mt-4 mb-4">
              <VBtn class="me-4" color="success" @click="saveProduct">
                Сохранить
              </VBtn>
              <VBtn @click="resetProductForm">Сбросить</VBtn>
            </VRow>

            <VDataTable :headers="productHeaders" :items="savedProducts">
              <template #no-data></template>
              <template #bottom></template>
              <template #[`item.sizes`]="{ item }">
                <div v-for="(s, i) in item.sizes" :key="i">
                  {{ s.value }} ({{ s.quantity }}) - {{ s.barcode }}
                </div>
              </template>
              <template #[`item.actions`]="{ item, index }">
                <!-- <VBtn class="me-4" icon color="primary" @click="editProduct(item)">
                  <VIcon>tabler-edit</VIcon>
                </VBtn> -->
                <!-- <RouterLink class="me-4" :to="{ name: 'product-details-id', params: { id: item.id } }">
                  <VBtn icon color="primary">
                    <VIcon>tabler-point</VIcon>
                  </VBtn>
                </RouterLink> -->
                <RouterLink :to="{ name: 'product-details-id', params: { id: item.id } }">
                  <IconBtn class="me-2" icon>
                    <VIcon size="20" icon="tabler-eye" />
                  </IconBtn>
                </RouterLink>
                <IconBtn icon color="error" @click="handleDelete(item.id)">
                  <VIcon size="20" icon="tabler-trash" />
                </IconBtn>
              </template>
            </VDataTable>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
      {{ snackMessage }}
    </VSnackbar>
  </div>
  <VDialog
      v-model="importResult.show"
      max-width="600"
      persistent
    >
      <VCard>
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>Результаты импорта</span>
          <VBtn
            icon
            variant="text"
            @click="importResult.show = false"
          >
            <VIcon>tabler-x</VIcon>
          </VBtn>
        </VCardTitle>

        <VCardText>
          <VList>
            <VListItem>
              <VListItemTitle class="font-weight-medium">
                Обработано товаров: {{ importResult.total_processed }}
              </VListItemTitle>
            </VListItem>
            
            <VListItem>
              <VListItemTitle>
                Создано: {{ importResult.created }}
              </VListItemTitle>
            </VListItem>
            
            <VListItem>
              <VListItemTitle>
                Обновлено: {{ importResult.updated }}
              </VListItemTitle>
            </VListItem>
          </VList>

          <VAlert
            v-if="importResult.errors.length"
            type="error"
            class="mt-4"
          >
            <VList>
              <VListItem
                v-for="(error, index) in importResult.errors"
                :key="index"
                class="pa-0"
              >
                <VListItemTitle class="text-error">
                  {{ error }}
                </VListItemTitle>
              </VListItem>
            </VList>
          </VAlert>

          <VAlert
            v-else
            type="success"
            class="mt-4"
          >
            Все товары успешно обработаны!
          </VAlert>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            color="primary"
            @click="importResult.show = false"
          >
            Закрыть
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
  <CustomLoading :loading="loading"/>
</template>
