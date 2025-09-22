<script setup lang="ts">
import { usePermissionsModal } from '@/composables/usePermissionsModal';

const { isVisible, hide, error } = usePermissionsModal()

</script>

<template>
  <VDialog v-model="isVisible" max-width="500" @click.self="hide">
    <VCard>
      <VCardTitle class="text-h6">{{ error.title }}</VCardTitle>
      <VDivider />
      <VCardText v-if="error.code === 401">
        <p>Сессия завершена.</p>
      </VCardText>
      <VCardText v-else-if="error.code === 403">
        <p v-if="error.message">У вас нет необходимых разрешений для выполнения действия {{ error.message }}.</p>
        <p v-else>У вас нет необходимых разрешений для выполнения действия.</p>
        <p>Обратитесь к администратору для получения доступа.</p>
      </VCardText>
      <VCardText v-else>
        <p>Произошла непредвиданная ошибка. Обратитесь к администратору.</p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="primary" @click="hide">Понятно</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
</style>
