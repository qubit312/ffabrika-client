<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getProfile, sendVerificationEmail } from '~/services/profile'

const emailVerified = ref(true)
const loading = ref(false)
const email = ref('')
const emailVerifiedDialog = ref(false)

async function loadProfile() {
  try {
    const { data, error } = await getProfile()
    if (!error.value && data.value?.success) {
      const u = data.value.data
      emailVerified.value = u.email_verified
      email.value = u.email
    }
  } catch (e) {
    console.error('Ошибка при загрузке профиля', e)
  }
}

onMounted(loadProfile)

const notifications = computed(() => {
  if (!emailVerified.value) {
    return [
      { id: 1, text: 'Пожалуйста, подтвердите вашу почту' },
    ]
  }
  return []
})

const unreadCount = computed(() => notifications.value.length)

async function handleVerifyEmail() {
  loading.value = true
  try {
    const { data, error } = await sendVerificationEmail()
    if (error.value || !data.value?.success) {
      console.error('Ошибка отправки письма', data.value?.message)
    } else {
      emailVerifiedDialog.value = true
    }
  } finally {
    loading.value = false
  }
}

function onDialogClose() {
  emailVerifiedDialog.value = false
  loadProfile()
}
</script>

<template>
  <div>
    <VMenu offset="12" transition="scale-transition">
      <template #activator="{ props }">
        <IconBtn v-bind="props" class="me-3">
          <VBadge
            v-if="unreadCount > 0"
            :content="unreadCount"
            color="error"
            offset-x="2"
            offset-y="2"
          >
            <VIcon size="24" icon="tabler-bell" />
          </VBadge>
          <VIcon v-else size="24" icon="tabler-bell" />
        </IconBtn>
      </template>

      <VList density="compact" min-width="280">
        <VListItem>
          <VListItemTitle class="text-subtitle-2">Уведомления</VListItemTitle>
        </VListItem>
        <VDivider />

        <VListItem
          v-for="n in notifications"
          :key="n.id"
          @click="handleVerifyEmail"
          class="cursor-pointer"
        >
          <template #prepend>
            <VProgressCircular
              v-if="loading"
              indeterminate
              size="16"
              width="2"
              color="primary"
              class="me-2"
            />
            <VIcon
              v-else
              icon="tabler-circle-x"
              color="warning"
              size="18"
              class="me-2"
            />
          </template>
          <VListItemTitle>{{ n.text }}</VListItemTitle>
        </VListItem>

        <VListItem v-if="notifications.length === 0">
          <VListItemTitle class="opacity-60">
            Нет новых уведомлений
          </VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>

    <VDialog v-model="emailVerifiedDialog" max-width="500" @update:model-value="val => !val && onDialogClose()">
      <VCard>
        <VCardTitle class="text-h6">Подтверждение почты</VCardTitle>
        <VDivider />
        <VCardText>
          Письмо с подтверждением отправлено на адрес <b>{{ email }}</b>.
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="onDialogClose">Готово</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
