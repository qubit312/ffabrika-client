<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUser } from '~/composables/useCurrentUser'

const route = useRoute()
const router = useRouter()
const { isAdmin } = useCurrentUser()

const sections = computed(() => ([
   /*{ value: '/account/personal',      label: 'Мои данные',            icon: 'tabler-users' }, */
     { value: '/account/users',         label: 'Участники',             icon: 'tabler-users-group' },
  { value: '/account/requisites',    label: 'Реквизиты',             icon: 'tabler-file-text' },

  /*{ value: '/account/shops',         label: 'Магазины',              icon: 'tabler-building-store' },*/
  /*{ value: '/account/notifications', label: 'Уведомления',           icon: 'tabler-bell' },*/
  /*...(isAdmin.value ? [
    { value: '/account/legal', label: 'Юридические документы', icon: 'tabler-file-description' },
    { value: '/account/all-users', label: 'Пользователи', icon: 'tabler-users-group'},
  ] : []),*/
]))

const go = (path: string) => { if (route.path !== path) router.push(path) }
</script>

<template>
  <div class="d-flex flex-wrap gap-2 mb-4">
    <VBtn
      v-for="s in sections"
      :key="s.value"
      :variant="route.path === s.value ? 'elevated' : 'text'"
      :color="route.path === s.value ? 'primary' : undefined"
      @click="go(s.value)"
    >
      <VIcon :icon="s.icon" start size="20" />
      {{ s.label }}
    </VBtn>
  </div>

  <NuxtPage />
</template>
