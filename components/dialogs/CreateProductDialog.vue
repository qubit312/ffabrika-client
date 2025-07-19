<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { categoryOptions } from '../../constants/productCategories'
import { getClients } from '../../services/clients'
import { createLabel } from '../../services/labels'
import { createProduct } from '../../services/products'
import type { Client } from '../../types/client'
import type { CreateWbProductDto } from '../../types/product'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'created'])

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, val => isOpen.value = val)
watch(isOpen, val => emit('update:modelValue', val))

const clients = ref<Client[]>([])
const router = useRouter()
const form = ref<CreateWbProductDto>({
  name: '',
  color: '',
  article: '',
  composition: '',
  has_chestny_znak: false,
  category: null as string | null,
  client_id: null as number | null,
})

const submit = async () => {
  try {
    const product = await createProduct(form.value)
    
    if (!product?.data?.value?.id) throw new Error('Ошибка при создании товара')

    const label = await createLabel({
      product_id: product.data.value.id,
      name: product.data.value.name,
    })
    const labelId = label?.data?.value?.id
    if (!labelId) throw new Error('Ошибка при создании этикетки')

    emit('created')
    isOpen.value = false

    router.push({ name: 'marking-details-id', params: { id: labelId } })
  } catch (e) {
    console.error(e)
  }
}

const closeDialog = async () => {
  isOpen.value = false
}

const fetchClients = async () => {
  const { data, error } = await getClients()
  
  if (error.value) {
    console.error('Ошибка при загрузке клиентов:', error.value)
    return
  }

  clients.value = data.value || []
}

onMounted(() => {
  fetchClients()
})
</script>

<template>
  <VDialog v-model="isOpen" max-width="400">
    <VCard>
      <VCardTitle>Создание нового товара</VCardTitle>
      <VCardText >
        <VTextField v-model="form.name" label="Название" class="mb-6" />
        <VSelect v-model="form.client_id" :items="clients" label="Клиент" item-title="name" item-value="id" class="mb-6" />
        <VTextField v-model="form.article" label="Артикул" class="mb-6" />
        <VSelect
          v-model="form.category"
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
        <VTextField v-model="form.color" label="Цвет" class="mb-6" />
        <VTextField v-model="form.composition" label="Состав" />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="grey" @click="closeDialog">Отменить</VBtn>
        <VBtn color="primary" @click="submit">Создать</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
