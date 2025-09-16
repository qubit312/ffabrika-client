<script setup lang="ts">
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { useFieldState } from '@/composables/useFieldState'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VForm } from 'vuetify/components'
import CustomLoading from '../../../components/CustomLoading.vue'
import { categoryOptions } from '../../../constants/productCategories'
import { createBrand, getBrands } from '../../../services/brands'
import { createClient, getClient, updateClient } from '../../../services/clients'
import { createProduct, deleteProduct, getProducts } from '../../../services/products'
import { createProductSize } from '../../../services/productSizes'

import type { Brand } from '../../../types/brand'
import type { Client, CreateClientDto } from '../../../types/client'
import type { CreateWbProductDto, WbProduct } from '../../../types/product'
import type { CreateProductSizeDto, ProductSize } from '../../../types/productSize'

import {
  account20Rule,
  bankNameRule,
  bicRule,
  corrAccount20Rule,
  formatRuPhone,
  innRule,
  ogrnipRule,
  optionalEmail,
  optionalRuPhone,
  required,
  requiredIf,
  stripDigits,
  telegramAtUsername,
  vatPercentRule,
} from '@/utils/validators'

const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string | undefined
const primaryId = idParam ? Number(idParam) : 0
const mode = ref<'create' | 'edit' | 'view'>('create')

const loading = ref(false)
const isFormInitialized = ref(false)
const originalForm = ref<Client | null>(null)

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const sizeItems = ref<ProductSize[]>([
  { id: 0, value: '', tech_size: '', barcode: '', product_id: 0 }
])

const savedProducts = ref<WbProduct[]>([])
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

type Rule = (v: any) => true | string
const submitted = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)

const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)
const { items: clientCrumbs } = useBreadcrumbs(
  'Клиенты',
  { name: 'client-list' },
  currentTitle,
  isCreate,
)

// === Input handlers ===
const onInnInput = (v: string) => {
  form.tin = v.replace(/[^0-9]/g, '').slice(0, form.type === 'INDIVIDUAL' ? 12 : 10)
}
const onOgrnipInput = (v: string) => {
  form.psrn = v.replace(/[^0-9]/g, '').slice(0, 15)
}
const onAccountInput = (v: string) => {
  form.account = v.replace(/[^0-9]/g, '').slice(0, 20)
}
const onCorrAccountInput = (v: string) => {
  form.correspondent_account = v.replace(/[^0-9]/g, '').slice(0, 20)
}
const onBicInput = (v: string) => {
  form.bic = v.replace(/[^0-9]/g, '').slice(0, 9)
}
const onPhoneInput = (v: string) => {
  let d = stripDigits(String(v || '')).slice(0, 11)
  if (d === '') { form.phone = ''; return }
  if (d[0] === '8') d = '7' + d.slice(1, 10)
  if (d[0] !== '7') d = '7' + d.slice(1, 10)
  form.phone = formatRuPhone(d)
}
const onTelegramInput = (v: string) => {
  let value = String(v || '').trim()
  if (value && !value.startsWith('@')) {
    value = '@' + value.replace(/^@+/, '')
  }
  form.telegram = value
}

// 20.00/20,00 -> 20 (0-20)
function toVatPercent(v: any): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return ''
  const clamped = Math.max(0, Math.min(20, Math.floor(n)))
  return String(clamped)
}
const onVatInput = (v: string) => {
  form.vat = toVatPercent(v)
}

const onBankInput = (v: string) => {
  form.bank = String(v || '').replace(/[^A-Za-zА-Яа-я\s"'\-«»]/g, '')
}

// === Rules ===
const tinRules = computed<Rule[]>(() => [required, innRule(() => form.type)])
const psrnRules = computed<Rule[]>(() => [
  requiredIf(() => form.type === 'INDIVIDUAL'),
  ogrnipRule,
])
const accountRules: Rule[] = [account20Rule]
const corrAccountRules: Rule[] = [corrAccount20Rule]
const bicRules: Rule[] = [bicRule]
const vatRules: Rule[] = [vatPercentRule]
const emailRules: Rule[] = [optionalEmail]
const telegramRules: Rule[] = [telegramAtUsername]
const phoneRules: Rule[] = [optionalRuPhone]
const bankRules: Rule[] = [bankNameRule]
const nameRules: Rule[] = [required]
const typeRules: Rule[] = [required]
const legalAddressRules: Rule[] = []
const wbApiTokenRules: Rule[] = []
const notesRules: Rule[] = []
const preferredContactRules: Rule[] = []

// === Server → Form mapping ===
function mapServerResponseToForm(serverData: any): void {
  form.id = serverData.id || 0
  form.name = serverData.name || ''
  form.type = serverData.type || ''
  form.phone = serverData.phone || ''
  form.email = serverData.email || ''
  form.telegram = serverData.telegram || ''
  form.details = {
    notes: serverData.details?.notes || '',
    preferred_contact: serverData.details?.preferred_contact || ''
  }
  form.tin = serverData.tin || ''
  form.psrn = serverData.psrn || ''
  form.account = serverData.account || ''
  form.wb_api_token = serverData.wb_api_token || ''
  form.bank = serverData.bank || ''
  form.correspondent_account = serverData.correspondent_account || ''
  form.bic = serverData.bic || ''
  form.legal_address = serverData.legal_address || ''
  form.vat = toVatPercent(serverData.vat)
  form.created_at = serverData.created_at || ''
  form.updated_at = serverData.updated_at || ''
  form.deleted_at = serverData.deleted_at || null

  originalForm.value = structuredClone(toRaw(form))
  submitted.value = false
}

// === Dirty tracking (без deep-watch + JSON.stringify) ===
const fieldsToTrack: (keyof Client)[] = [
  'name','type','phone','email','telegram','tin','psrn','account',
  'wb_api_token','bank','correspondent_account','bic','legal_address','vat'
]
const isDirty = computed(() => {
  if (!originalForm.value) return false
  return fieldsToTrack.some(k => form[k] !== originalForm.value![k])
})
watch(isDirty, (dirty) => {
  if (mode.value === 'view' && isFormInitialized.value && primaryId > 0 && dirty) {
    mode.value = 'edit'
    submitted.value = false
  }
})

// === Products ===
const productForm = reactive({
  name: '',
  color: '',
  article: '',
  composition: '',
  category: '',
  size: [] as string[],
  hasChestnyZnak: false
})

function buildSubmitPayload(f: Client): CreateClientDto {
  return {
    name: f.name,
    type: f.type,
    email: f.email,
    phone: f.phone,
    telegram: f.telegram,
    details: {
      notes: f.details.notes,
      preferred_contact: f.details.preferred_contact,
    },
    tin: f.tin,
    psrn: f.psrn,
    account: f.account,
    bank: f.bank,
    wb_api_token: f.wb_api_token,
    correspondent_account: f.correspondent_account,
    bic: f.bic,
    legal_address: f.legal_address,
    vat: f.vat,
  }
}

async function saveProduct() {
  loading.value = true
  const payload: CreateWbProductDto = {
    client_id: primaryId,
    name:      productForm.name,
    color:     productForm.color,
    article:   productForm.article,
    composition: productForm.composition,
    category:  productForm.category,
    has_chestny_znak: productForm.hasChestnyZnak,
    vendor_code: '',
    brand_id: null
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

async function saveSize(item: ProductSize, productId: number) {
  try {
    const dto: CreateProductSizeDto = {
      product_id: productId,
      value:      item.value,
      tech_size:  item.tech_size,
      barcode:    item.barcode,
    }
    const response = await createProductSize(dto)
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
    mode.value = 'view'
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
    const list: WbProduct[] = (data.value ?? []).map(prod => ({
      ...prod,
      productSizes: []
    }))
    savedProducts.value = list
  }
  loading.value = false
}

async function onSubmit() {
  submitted.value = true
  const res = await formRef.value?.validate?.()
  if (res && 'valid' in res && !res.valid) {
    snackColor.value = 'error'
    snackMessage.value = 'Проверьте заполнение полей'
    snackbar.value = true
    return
  }

  loading.value = true
  const dto = buildSubmitPayload(form) as CreateClientDto

  const response = mode.value === 'edit'
    ? await updateClient(primaryId, dto)
    : await createClient(dto)

  const { data, error } = response

  if (error.value) {
    snackColor.value = 'error'
    snackMessage.value = 'Ошибка сохранения клиента'
  } else {
    snackColor.value = 'success'
    snackMessage.value = mode.value === 'edit' ? 'Клиент обновлён' : 'Клиент создан'

    if (mode.value === 'edit') {
      originalForm.value = structuredClone(toRaw(form))
      mode.value = 'view'
      submitted.value = false
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
    snackColor.value = 'success'
    snackMessage.value = 'Товар удалён'
  } catch (err) {
    console.error('Ошибка при удалении товара:', err)
    snackColor.value = 'error'
    snackMessage.value = 'Не удалось удалить товар'
  } finally {
    snackbar.value = true
    loading.value = false
  }
}

onMounted(() => {
  if (primaryId > 0) {
    fetchClient(primaryId)
    fetchProducts()
    fetchBrands(primaryId)
  }
})

const productHeaders = [
  { title: 'Название', key: 'name', sortable: false },
  { title: 'Артикул', key: 'article', sortable: false },
  { title: 'Цвет', key: 'color', sortable: false },
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
  sizeItems.value = [{ id: 0, value: '', tech_size: '', barcode: '', product_id: 0 }]
}

function cancelEdit() {
  if (originalForm.value) {
    Object.assign(form, structuredClone(toRaw(originalForm.value)))
    mode.value = 'view'
    submitted.value = false
  }
}

const addSize = () => {
  sizeItems.value.push({ value: '', tech_size: '', barcode: '', id: 0, product_id: 0 })
}

const removeSize = (idx: number) => {
  if (sizeItems.value.length > 1) {
    sizeItems.value.splice(idx, 1)
  }
}

async function fetchBrands(clientId: number) {
  loading.value = true
  const { data, error } = await getBrands(clientId)
  if (error.value) {
    console.error('Ошибка при загрузке брендов:', error.value)
  } else {
    mode.value = 'view'
    clientBrands.value = data.value
  }
  loading.value = false
}

const editedBrandVisible = ref(false)
const clientBrands = ref<Brand[]>([])
const editedBrand = reactive({
  name: '',
  clientId: primaryId,
})

const submitBrand = async () => {
  if (!editedBrandVisible.value) {
    editedBrandVisible.value = true
    return
  }

  loading.value = true
  try {
    const payload = {
      name: editedBrand.name,
      client_id: editedBrand.clientId
    }
    const { data, error } = await createBrand(payload)
    if (error.value) {
      snackColor.value = 'error'
      snackMessage.value = 'Ошибка при сохранении бренда'
    } else {
      snackColor.value = 'success'
      snackMessage.value = 'Бренд создан'
      const brand: Brand = data.value
      if (brand && brand.id && brand.name) {
        clientBrands.value.push({ name: brand.name, id: brand.id, client_id: brand.client_id })
      }
      editedBrand.name = ''
    }
    editedBrandVisible.value = false
    snackbar.value = true
  } catch (e) {
    console.error('Brand submit error:', e)
    snackColor.value = 'error'
    snackMessage.value = 'Неизвестная ошибка при сохранении бренда'
  } finally {
    loading.value = false
  }
}

// === Field states (без повторных вычислений в шаблоне) ===
const nameState  = useFieldState(nameRules,  computed(()=>form.name),  submitted)
const typeState  = useFieldState(typeRules,  computed(()=>form.type),  submitted)
const phoneState = useFieldState(phoneRules, computed(()=>form.phone), submitted)
const emailState = useFieldState(emailRules, computed(()=>form.email), submitted)
const tgState    = useFieldState(telegramRules, computed(()=>form.telegram), submitted)

const tinState   = useFieldState(tinRules, computed(()=>form.tin), submitted)
const psrnState  = useFieldState(psrnRules, computed(()=>form.psrn), submitted)
const accState   = useFieldState(accountRules, computed(()=>form.account), submitted)
const bankState  = useFieldState(bankRules, computed(()=>form.bank), submitted)
const corrState  = useFieldState(corrAccountRules, computed(()=>form.correspondent_account), submitted)
const bicState   = useFieldState(bicRules, computed(()=>form.bic), submitted)
const vatState   = useFieldState(vatRules, computed(()=>form.vat), submitted)

const legalState = useFieldState(legalAddressRules, computed(()=>form.legal_address), submitted)
const wbTokenState = useFieldState(wbApiTokenRules, computed(()=>form.wb_api_token), submitted)

</script>

<template>
  <div>
    <AppBreadcrumbs :items="clientCrumbs" class="mb-2" />

    <VForm ref="formRef" :validate-on="submitted ? 'input' : 'blur'">
      <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
        <div class="d-flex flex-column justify-center">
          <h4 class="text-h4 font-weight-medium">
            {{ mode === 'create' ? 'Вы создаете нового клиента' : form.name }}
          </h4>
          <div class="text-body-1">Детальная информация о клиенте</div>
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
          <VCard class="mb-6">
            <VCardText>
              <VRow>
                <VCol cols="12" md="12">
                  <AppTextField
                    v-model="form.name"
                    label="Название"
                    placeholder="Введите название клиента"
                    outlined
                    :rules="nameRules"
                    v-bind="nameState"
                  />
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
                    :rules="typeRules"
                    v-bind="typeState"
                  />
                </VCol>

                <VCol cols="12" md="12">
                  <AppTextField
                    :model-value="form.phone"
                    label="Телефон"
                    outlined
                    :rules="phoneRules"
                    inputmode="tel"
                    maxlength="18"
                    v-bind="phoneState"
                    @update:modelValue="onPhoneInput"
                  />
                </VCol>

                <VCol cols="12" md="12">
                  <AppTextField
                    v-model="form.email"
                    label="Email"
                    outlined
                    :rules="emailRules"
                    v-bind="emailState"
                  />
                </VCol>

                <VCol cols="12" md="12">
                  <AppTextField
                    :model-value="form.telegram"
                    label="Telegram"
                    placeholder="@username"
                    outlined
                    :rules="telegramRules"
                    v-bind="tgState"
                    @update:modelValue="onTelegramInput"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <VCard title="Мои бренды" class="mb-6">
            <VCardText>
              <VRow>
                <VCol md="12" class="pt-0 pb-0">
                  <VList class="pt-0 pb-0">
                    <template v-for="(brand, index) of clientBrands" :key="brand.id">
                      <AppTextField class="mb-4" v-model="brand.name" outlined readonly />
                    </template>
                  </VList>
                  <AppTextField class="mb-4" v-if="editedBrandVisible" v-model="editedBrand.name" outlined>
                    <template #append>
                      <VIcon
                        color="error"
                        icon="tabler-x"
                        @click="editedBrandVisible = !editedBrandVisible"
                      />
                    </template>
                  </AppTextField>
                </VCol>

                <VCol md="12">
                  <VBtn color="primary" @click="submitBrand">
                    <VIcon start :icon="editedBrandVisible ? 'tabler-check' : 'tabler-plus'" />
                    {{ editedBrandVisible ? "Сохранить" : "Добавить" }}
                  </VBtn>
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
                  <AppTextField
                    :model-value="form.tin"
                    label="ИНН"
                    outlined
                    :rules="tinRules"
                    :maxlength="form.type === 'INDIVIDUAL' ? 12 : 10"
                    inputmode="numeric"
                    v-bind="tinState"
                    @update:modelValue="onInnInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.psrn"
                    label="ОГРНИП"
                    outlined
                    :rules="psrnRules"
                    maxlength="15"
                    inputmode="numeric"
                    v-bind="psrnState"
                    @update:modelValue="onOgrnipInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.account"
                    label="Счёт"
                    outlined
                    :rules="accountRules"
                    maxlength="20"
                    inputmode="numeric"
                    v-bind="accState"
                    @update:modelValue="onAccountInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.bank"
                    label="Банк"
                    outlined
                    :rules="bankRules"
                    v-bind="bankState"
                    @update:modelValue="onBankInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.correspondent_account"
                    label="Корр. счёт"
                    outlined
                    :rules="corrAccountRules"
                    maxlength="20"
                    inputmode="numeric"
                    v-bind="corrState"
                    @update:modelValue="onCorrAccountInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.bic"
                    label="БИК"
                    outlined
                    :rules="bicRules"
                    maxlength="9"
                    inputmode="numeric"
                    v-bind="bicState"
                    @update:modelValue="onBicInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    :model-value="form.vat"
                    label="НДС(%)"
                    outlined
                    :rules="vatRules"
                    inputmode="numeric"
                    maxlength="2"
                    v-bind="vatState"
                    @update:modelValue="onVatInput"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="form.legal_address"
                    label="Юридический адрес"
                    outlined
                    :rules="legalAddressRules"
                    v-bind="legalState"
                  />
                </VCol>

                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="form.wb_api_token"
                    label="Токен WB API"
                    outlined
                    :rules="wbApiTokenRules"
                    v-bind="wbTokenState"
                  />
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
                    :menu-props="{ maxHeight: 200, location: 'bottom', offset: 2, persistent: true }"
                  />
                </VCol>
                <VCol cols="4">
                  <VSwitch v-model="productForm.hasChestnyZnak" label="Нужна маркировка ЧЗ" />
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
                    <VBtn icon color="error" @click="removeSize(i)" v-if="sizeItems.length > 1">
                      <VIcon size="20" icon="tabler-trash" />
                    </VBtn>
                  </VCol>
                </VRow>
              </div>

              <VRow class="justify-end mt-4 mb-4">
                <VBtn class="me-4" color="success" @click="saveProduct">Сохранить</VBtn>
                <VBtn @click="resetProductForm">Сбросить</VBtn>
              </VRow>

              <VDataTable :headers="productHeaders" :items="savedProducts">
                <template #no-data></template>
                <template #bottom></template>
                <template #[`item.actions`]="{ item }">
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
    </VForm>

    <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
      {{ snackMessage }}
    </VSnackbar>

    <CustomLoading :loading="loading" />
  </div>
</template>

<style scoped>
/* Обычные сообщения (messages) — чёрные */
:deep(.v-messages__message) {
  color: #000; /* или var(--v-theme-on-surface) */
}

/* Когда инпут в ошибке — оставляем красный от темы */
:deep(.v-input--error .v-messages__message) {
  color: var(--v-theme-error);
}
</style>
