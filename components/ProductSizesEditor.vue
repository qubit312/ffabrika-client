<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue'

interface SizeItem {
  id?: number
  value: string
  barcode: string
  quantity: number
}

const props = defineProps<{
  modelValue: SizeItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SizeItem[]): void
}>()

// Локальная копия для реактивного редактирования
const localSizes = ref<SizeItem[]>([...props.modelValue])

watch(() => props.modelValue, val => {
  localSizes.value = [...val]
}, { deep: true })

watch(localSizes, val => {
  emit('update:modelValue', val)
}, { deep: true })

const addSize = () => {
  localSizes.value.push({ value: '', quantity: 0, barcode: '' })
}

const removeSize = (idx: number) => {
  if (localSizes.value.length > 1) {
    localSizes.value.splice(idx, 1)
  }
}
</script>

<template>
  <div v-for="(item, i) in localSizes" :key="i">
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
          v-if="localSizes.length > 1"
        >
          <VIcon size="20" icon="tabler-trash" />
        </VBtn>
      </VCol>
    </VRow>
  </div>
</template>
