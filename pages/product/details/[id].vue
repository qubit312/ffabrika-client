<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../../../composables/useApi'
import type { CategoryCode } from '../../../constants/productCategories'
import { categoryOptions } from '../../../constants/productCategories'
import { createProduct, getProduct, updateProduct } from '../../../services/products'
import type { CreateWbProductDto } from '../../../types/product'

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const primaryId = Number(idParam)
const mode = ref<'create' | 'edit'>('create')

const clientOptions = ref<{ label: string; value: number }[]>([])
const composition = ref<string>('')
const article = ref<string>('')
const selectedCategory = ref<CategoryCode>()
const clientId = ref<number>()
const name = ref<string>('')
const color = ref<string>('')

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const isLoading = ref(false)

async function fetchClients() {
  const { data, error } = await useApi<{ data: { id: number; name: string }[]; total: number }>('/api/clients', {
    method: 'GET'
  })
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
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
}

async function fetchProduct(id: number) {
  const { data, error } = await getProduct(id)

  if (error.value) {
    console.error('Ошибка при загрузке товара:', error.value)
    return
  }

  const p = data.value
  clientId.value = p.client_id
  name.value = p.name
  color.value = p.color
  article.value = p.article
  composition.value = p.composition
  selectedCategory.value = p.category
  mode.value = 'edit'
}

async function onSubmit() {
  isLoading.value = true

  if (!clientId.value || !selectedCategory.value) {
    showSnackbar('Выберите клиента и категорию', false)
    isLoading.value = false
    return
  }

  const payload: CreateWbProductDto = {
    client_id: clientId.value,
    name: name.value,
    color: color.value,
    article: article.value,
    category: selectedCategory.value,
    composition: composition.value,
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
    isLoading.value = false
    return
  }

  showSnackbar('Успешно сохранено', true)
  if (mode.value !== 'edit') {
    await router.push({ name: 'product-details-id', params: { id: data.value.id } })
  }

  isLoading.value = false
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
                <AppTextField v-model="name" label="Название" outlined />
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
                <AppTextField v-model="color" label="Цвет" outlined />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  label="Состав"
                  placeholder="Хлопок 95%"
                  v-model="composition"
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
                <AppSelect
                  v-model="selectedCategory"
                  :items="categoryOptions"
                  item-title="label"
                  item-value="value"
                  label="Категория"
                  placeholder="Выберите категорию"
                  clearable
                  class="mb-6"
                />
              </VCol>
            </VRow>
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
