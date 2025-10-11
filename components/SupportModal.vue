<template>
  <VDialog v-model="isOpen" max-width="360" transition="dialog-bottom-transition">
    <VCard class="pa-0 text-center overflow-hidden rounded-l" elevation="8">
      <div class="support-header py-6 px-4">
        <VAvatar size="80" class="mx-auto mb-3 border border-white border-2">
          <img src="@images/avatars/avatar-1.png" alt="Эльдар" />
        </VAvatar>

        <div class="text-h6 font-weight-medium text-white mb-1">Эльдар</div>
        <div class="text-body-2 text-white opacity-80">Ваш персональный менеджер</div>
      </div>
      <div class="support-body py-4 px-6 bg-white">
        <VBtn
          color="telegram"
          block
          class="mb-3 text-white py-3"
          href="https://t.me/FASTWMS_Bot"
          target="_blank"
        >
          <VIcon start icon="tabler-brand-telegram" />
          Telegram
        </VBtn>

        <div class="text-caption text-medium-emphasis d-flex align-center justify-center">
          <VIcon size="14" icon="tabler-clock" class="me-1" />
          Отвечаем обычно в течение 15 минут
        </div>
      </div>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue'])
const isOpen = ref(props.modelValue)

watch(isOpen, val => emit('update:modelValue', val))
watch(() => props.modelValue, val => (isOpen.value = val))
</script>

<style scoped>
.support-header {
  background: linear-gradient(135deg, #a050f4, #7b2ff7);
  position: relative;
  color: white;
}
.support-header::before,
.support-header::after {
  content: '✨';
  position: absolute;
  font-size: 18px;
  opacity: 0.6;
}
.support-header::before {
  top: 10px;
  left: 25px;
}
.support-header::after {
  bottom: 15px;
  right: 30px;
}
</style>
