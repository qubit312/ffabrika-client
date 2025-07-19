<template>
  <VDialog v-model="dialogVisible" max-width="350px">
    <VCard>
      <VCardText class="pt-6 pb-4 text-h6">
        {{ confirmationText }}
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="secondary" variant="elevated" @click="onCancel">
          Отменить
        </VBtn>
        <VBtn color="primary" variant="elevated" @click="onConfirm">
          ОК
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean
  confirmationText: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const dialogVisible = ref(props.modelValue)

// синхронизация от родителя к компоненту
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

// синхронизация от компонента к родителю
watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const onCancel = () => {
  dialogVisible.value = false
}


const onConfirm = () => {
  emit('confirm')
  dialogVisible.value = false
}
</script>
