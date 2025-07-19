<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import type { VForm } from 'vuetify/components/VForm'
import { categoryOptions } from '../../../../constants/productCategories'
import { getClients } from '../../../../services/clients'
import { createLabel } from '../../../../services/labels'
import { createProduct } from '../../../../services/products'
import type { Client } from '../../../../types/client'
import type { CreateWbProductDto } from '../../../../types/product'

interface Emit {
  (e: 'update:isDrawerOpen', value: boolean): void
  (e: 'created'): void
}

interface Props {
  isDrawerOpen: boolean
}

const resetForm = () => {
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()
const clients = ref<Client[]>([])
const router = useRouter()
const refForm = ref<VForm>()

const handleDrawerModelValueUpdate = (val: boolean) => {
  emit('update:isDrawerOpen', val)
}

const closeNavigationDrawer = () => {
  emit('update:isDrawerOpen', false)
  resetForm()
}

const productForm = ref<CreateWbProductDto>({
  name: '',
  color: '',
  article: '',
  composition: '',
  category: null as string | null,
  client_id: null as number | null,
  has_chestny_znak: false
})

const onSubmit = async () => {
  const { valid } = await refForm.value?.validate() || {}
  if (!valid) return 
  
  try {
    const product = await createProduct(productForm.value)
    
    if (!product?.data?.value?.id) throw new Error('Ошибка при создании товара')

    const label = await createLabel({
      product_id: product.data.value.id,
      name: product.data.value.name,
      has_chestny_znak: false,
    })
    const labelId = label?.data?.value?.id
    if (!labelId) throw new Error('Ошибка при создании этикетки')

    emit('created')
    emit('update:isDrawerOpen', false)
    resetForm()
    router.push({ name: 'marking-details-id', params: { id: labelId } })
  } catch (e) {
    console.error(e)
  }
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
  <VNavigationDrawer
    temporary
    :width="400"
    location="end"
    class="scrollable-content"
    :model-value="props.isDrawerOpen"
    @update:model-value="handleDrawerModelValueUpdate"
  >
    <AppDrawerHeaderSection
      title="Добавить новый товар"
      @cancel="closeNavigationDrawer"
    />

    <VDivider />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <VForm
            ref="refForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="productForm.name" :rules="[requiredValidator]" label="Название" />
              </VCol>
              <VCol cols="12">
                <AppSelect v-model="productForm.client_id" :items="clients" :rules="[requiredValidator]" label="Клиент" item-title="name" item-value="id" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="productForm.article" :rules="[requiredValidator]" label="Артикул" />
              </VCol>
              <VCol cols="12">
                <AppSelect
                  :rules="[requiredValidator]"
                  v-model="productForm.category"
                  :items="categoryOptions"
                  label="Категория"
                  item-title="label"
                  item-value="value"
                  :menu-props="{
                    maxHeight: 200,
                    location: 'bottom',
                    offset: 2,
                    persistent: true
                  }"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="productForm.color" :rules="[requiredValidator]" label="Цвет"/>
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="productForm.composition" label="Состав" />
              </VCol>
              <VCol cols="12">
                <VSwitch
                  v-model="productForm.has_chestny_znak"
                  label="Нужна маркировка ЧЗ"
                />
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  class="me-3"
                >
                  Сохранить
                </VBtn>
                <VBtn
                  type="reset"
                  variant="tonal"
                  color="error"
                  @click="closeNavigationDrawer"
                >
                  Отменить
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>
