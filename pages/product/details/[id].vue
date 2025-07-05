<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../../../composables/useApi'
import type { Product } from '../../../types/product'

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const primaryId = Number(idParam)

const mode = ref<'create' | 'edit'>('create')
const token = localStorage.getItem('access_token') || ''

const orderOptions = ref<{ label: string; value: number }[]>([])
const productOptions = ref<{ label: string; value: number }[]>([])
const clientOptions = ref<{ label: string; value: number }[]>([])

const orderId = ref<number | null>(null)
const parentId = ref<number | null>(null)
const clientId = ref<number | null>(null)
const name = ref<string>('')
const qty = ref<number>(0)
const color = ref<string>('')
const size = ref<string>('')
const complect = ref<number>(0)
const delivered = ref<boolean>(false)

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const isLoading = ref(false)

async function fetchOrders() {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const { data, error } = await useApi<{
    data: { id: number; name: string }[]
    total: number
  }>('/api/orders', { method: 'GET', headers })

  if (error.value) {
    console.error('Ошибка при загрузке заказов:', error.value)
    return
  }

  orderOptions.value = data.value.data.map(o => ({
    label: `№${o.id}`,
    value: o.id,
  }))
}

async function fetchProducts() {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const { data, error } = await useApi<Product[]>('/api/products', {
    method: 'GET',
    headers,
  })

  if (error.value) {
    console.error('Ошибка при загрузке родительских товаров:', error.value)
    return
  }

  productOptions.value = data.value.map(p => ({
    label: `${p.name} (ID: ${p.id})`,
    value: p.id,
  }))
}

async function fetchClients() {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const { data, error } = await useApi<{ data: { id: number; name: string }[]; total: number }>('/api/clients', {
    method: 'GET',
    headers,
  })
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }
  clientOptions.value = data.value.map(c => ({
    label: c.name,
    value: c.id,
  }))
}


async function fetchProduct(id: number) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const { data, error } = await useApi<Product>(`/api/products/${id}`, {
    method: 'GET',
    headers,
  })

  if (error.value) {
    console.error('Ошибка при загрузке товаров:', error.value)
    return
  }

  const p = data.value
  clientId.value = p.client_id
  orderId.value = p.order_id
  parentId.value = p.parent_id
  name.value = p.name
  qty.value = p.qty
  color.value = p.color
  complect.value = p.complect
  delivered.value = Boolean(p.delivered)
  size.value = JSON.stringify(p.size)
  mode.value = 'edit'
}

async function onSubmit() {
  isLoading.value = true
  let sizeArr: string[]
  try {
    // TO DO:
    if (!size.value) {
      size.value = '["133","134","154"]'
    }
    sizeArr = JSON.parse(size.value)
  } catch {
    snackColor.value = 'error'
    snackMessage.value = 'Неверный формат размеров'
    snackbar.value = true
    isLoading.value = false
    return
  }

  const payload = {
    client_id: clientId.value,
    order_id: orderId.value,
    parent_id: parentId.value,
    name: name.value,
    qty: qty.value,
    color: color.value,
    size: sizeArr,
    complect: complect.value,
    delivered: delivered.value ? 1 : 0,
  }

  const isEdit = mode.value === 'edit'
  const url    = isEdit ? `/api/products/${primaryId}` : '/api/products'
  const method = isEdit ? 'PUT' : 'POST'
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const { data, error } = await useApi<Product>(url, {
    method,
    headers,
    body: payload,
  })

  if (error.value) {
    console.error('Ошибка при сохранении товара:', error.value)
    snackColor.value = 'error'
    snackMessage.value = 'Сохранение не удалось'
    snackbar.value = true
    isLoading.value = false
    return
  }
  
  snackColor.value = 'success'
  snackMessage.value = 'Успешно сохранено'
  snackbar.value = true

  if (!isEdit) {
    await router.push({ name: 'product-details-id', params: { id: data.value.id } })
  }
  isLoading.value = false
}

onMounted(async () => {
  await fetchOrders()
  await fetchProducts()
  await fetchClients()
  if (primaryId > 0) {
    await fetchProduct(primaryId)
  }
})
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{ mode === 'create' ? 'Вы создаете новый товар' : name }}
        </h4>
        <div class="text-body-1">{{ mode === 'create' ? '' : 'Подробная информация о товаре' }}</div>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap">
        <VBtn variant="tonal" color="secondary" @click="router.back()">Закрыть</VBtn>
        <VBtn color="primary" @click="onSubmit">Сохранить</VBtn>
      </div>
    </div>

    <VRow>
      <VCol md="8">
        <VCard class="mb-6" title="Подробности">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="orderId"
                  :items="orderOptions"
                  item-title="label"
                  item-value="value"
                  label="Заказ"
                  placeholder="Выберите заказ"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="clientId"
                  :items="clientOptions"
                  item-title="label"
                  item-value="value"
                  label="Клиент"
                  placeholder="Выберите клиента"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="parentId"
                  :items="productOptions"
                  item-title="label"
                  item-value="value"
                  label="Родительский товар"
                  placeholder="Выберите товар"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="name" label="Название" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model.number="qty"
                  label="Кол-во"
                  type="number"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="color" label="Цвет" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model.number="complect"
                  label="Комплект"
                  type="number"
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <VCheckbox v-model="delivered" label="Доставлено" />
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <VCol md="4" cols="12">
        <VCard class="mb-12" title="Размеры">
          <VCardText>
            <VTextarea
              v-model="size"
              label="Размеры (JSON)"
              rows="3"
              placeholder='["S","M","L"]'
              outlined
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
</template>

<style lang="scss" scoped>
</style>
