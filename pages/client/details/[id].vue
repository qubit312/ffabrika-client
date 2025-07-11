<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { categoryOptions } from '../../../constants/productCategories'
import { createClient, getClient, updateClient } from '../../../services/clients'
import { createProduct, deleteProduct, getProducts, updateProduct } from '../../../services/products'
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
const mode = ref<'create' | 'edit'>('create')
const isLoading = ref(false)

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const sizeItems = ref<SizeItem[]>([
  { value: '', quantity: 0, barcode: '' }
])
interface ProductUI extends WbProduct {
  sizes: SizeItem[]
}

const savedProducts = ref<ProductUI[]>([])
const editingIndex = ref<number | null>(null)
const form = ref<Client>({
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
  bank: '',
  correspondent_account: '',
  bic: '',
  legal_address: '',
  vat: '',
  created_at: '',
  updated_at: '',
  deleted_at: null,
})

const productForm = reactive({
  name: '',
  color: '',
  article: '',
  composition: '',
  category: '',
  size: [] as string[],
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
    correspondent_account: form.correspondent_account,
    bic: form.bic,
    legal_address: form.legal_address,
    vat: form.vat,
  }
}

const isEditing = computed(() => editingIndex.value !== null)

const productHeaders = [
  { title: 'Название', key: 'name', sortable: false},
  { title: 'Артикул', key: 'article', sortable: false },
  { title: 'Цвет', key: 'color', sortable: false},
  { key: 'actions', sortable: false },
]

function addSize() {
  sizeItems.value.push({
    value: '',
    quantity: 0,
    barcode: ''
  })
}

function removeSize(idx: number) {
  sizeItems.value.splice(idx, 1)
}

function resetForm() {
  productForm.name = ''
  productForm.color = ''
  productForm.article = ''
  productForm.composition = ''
  productForm.category = ''
  productForm.size = [] 
  editingIndex.value = null
  sizeItems.value = [
    { value: '', quantity: 0, barcode: '' }
  ]
}

async function saveProduct() {
  isLoading.value = true
  const payload: CreateWbProductDto = {
    client_id: primaryId,
    name:      productForm.name,
    color:     productForm.color,
    article:     productForm.article,
    composition:     productForm.composition,
    category:     productForm.category,
  }
  const response = isEditing.value
    ? await updateProduct(payload, savedProducts.value[editingIndex.value!].id)
    : await createProduct(payload)

  const { data, error } = response

  if (error.value) {
    snackColor.value = 'error'
    snackMessage.value = 'Не удалось сохранить товар'
  } else {
    snackColor.value = 'success'
    snackMessage.value = isEditing.value ? 'Товар обновлён' : 'Товар создан'

    const prod = data.value
    if (isEditing.value) {
      savedProducts.value.splice(editingIndex.value!, 1, prod)
    } else {
      savedProducts.value.push(prod)
    }

    for (const si of sizeItems.value) {
      await saveSize(si, prod.id)
    }

    resetForm()
  }

  snackbar.value = true
  isLoading.value = false
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
  isLoading.value = true
  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    form.value = data.value.data
    mode.value = 'edit'
  }
  isLoading.value = false
}

async function fetchProducts() {
  isLoading.value = true
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

  isLoading.value = false
}


async function saveClient() {
  isLoading.value = true
  const dto = buildSubmitPayload(form.value) as CreateClientDto

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

    if (mode.value === 'create') {
      const newId = data.value.data.id
      router.push({ name: 'client-details-id', params: { id: newId } })
    }
  }

  snackbar.value = true
  isLoading.value = false
}

async function handleDelete(id: number) {
  isLoading.value = true

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
    isLoading.value  = false
  }
}

onMounted(() => {
  if (primaryId > 0) {
    fetchClient(primaryId)
    fetchProducts()
  }
})
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{ mode === 'create' ? 'Вы создаете нового клиента' : form.name }}
        </h4>
        <div class="text-body-1">{{ mode === 'create' ? '' : 'Детальная информация о клиенте' }}</div>
      </div>
      <div class="d-flex gap-4 align-center flex-wrap">
        <VBtn variant="tonal" color="secondary" @click="router.back()">
          Закрыть
        </VBtn>
        <VBtn color="primary" :loading="isLoading" @click="saveClient">
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
                    <VIcon
                      size="20"
                      icon="tabler-plus"
                    />
                  </VBtn>
                  <VBtn
                    color="error"
                    @click="removeSize(i)"
                    icon
                    v-if="sizeItems.length > 1"
                  >
                    <VIcon
                      size="20"
                      icon="tabler-trash"
                    />
                  </VBtn>
                </VCol>
              </VRow>
            </div>

            <!-- Кнопки сохранения -->
            <VRow class="justify-end mt-4 mb-4">
              <VBtn class="me-4" color="success" @click="saveProduct">
                {{ isEditing ? 'Обновить' : 'Сохранить' }}
              </VBtn>
              <VBtn @click="resetForm">Сбросить</VBtn>
            </VRow>

            <VDataTable :headers="productHeaders" :items="savedProducts">
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
                <VBtn icon color="error" @click="handleDelete(item.id)">
                  <VIcon size="20" icon="tabler-trash" />
                </VBtn>
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
</template>
