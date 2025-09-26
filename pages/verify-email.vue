<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProfile, verifyEmail } from '~/services/profile'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const success = ref<boolean | null>(null)
const message = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined
  const email = localStorage.getItem('user_email') || ''

  if (!token || !email) {
    success.value = false
    message.value = 'Некорректная ссылка подтверждения'
    loading.value = false
    return
  }

  try {
    const { data, error } = await verifyEmail({ token, email })

    if (error.value || !data.value?.success) {
      success.value = false
      message.value = data.value?.message || 'Ошибка подтверждения'
    } else {
      success.value = true
      message.value = data.value.message || 'Почта успешно подтверждена'

      await getProfile()
      setTimeout(() => router.push('/'), 2000)
    }
  } catch (e) {
    success.value = false
    message.value = 'Ошибка обработки запроса'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <VContainer class="fill-height d-flex justify-center align-center">
    <VCard max-width="480" class="pa-6 text-center">
      <VProgressCircular v-if="loading" indeterminate color="primary" size="40" />

      <div v-else>
        <VIcon
          v-if="success"
          icon="tabler-check"
          size="48"
          color="success"
          class="mb-4"
        />
        <VIcon
          v-else
          icon="tabler-x"
          size="48"
          color="error"
          class="mb-4"
        />

        <h2 class="text-h6 mb-2">
          {{ success ? 'Подтверждение успешно' : 'Ошибка подтверждения' }}
        </h2>
        <p>{{ message }}</p>

        <VBtn v-if="!success" class="mt-4" @click="$router.push('/')">
          Вернуться в профиль
        </VBtn>
      </div>
    </VCard>
  </VContainer>
</template>
