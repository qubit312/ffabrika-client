<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useCurrentUser } from '~/composables/useCurrentUser'

const route = useRoute()
const { isAdmin } = useCurrentUser()

const items = computed(() => [
  { to: '/account/personal',       icon: 'tabler-user',             text: 'Мои данные' },
  { to: '/account/requisites',     icon: 'tabler-building-bank',    text: 'Реквизиты' },
  { to: '/account/users',          icon: 'tabler-users',            text: 'Пользователи' },
  { to: '/account/products',       icon: 'tabler-package',          text: 'Товары' },
  { to: '/account/shops',          icon: 'tabler-building-store',   text: 'Магазины' },
  { to: '/account/notifications',  icon: 'tabler-bell',             text: 'Уведомления' },
])

const adminItems = [
  { to: '/account/legal', icon: 'tabler-file-description', text: 'Юридические документы' },
]

const emit = defineEmits<{ (e: 'navigated'): void }>()
</script>

<template>
  <VCard>
    <VCardTitle class="text-h6">Личный кабинет</VCardTitle>
    <VDivider />

    <VList density="comfortable" nav>
      <VListItem
        v-for="it in items"
        :key="it.to"
        :to="it.to"
        :active="route.path === it.to"
        @click="$emit('navigated')"
      >
        <template #prepend>
          <VIcon :icon="it.icon" class="me-2" />
        </template>
        <VListItemTitle>{{ it.text }}</VListItemTitle>
      </VListItem>

      <template v-if="isAdmin">
        <VDivider class="my-2" />
        <VListSubheader>Администратор</VListSubheader>
        <VListItem
          v-for="it in adminItems"
          :key="it.to"
          :to="it.to"
          :active="route.path === it.to"
          @click="$emit('navigated')"
        >
          <template #prepend>
            <VIcon :icon="it.icon" class="me-2" />
          </template>
          <VListItemTitle>{{ it.text }}</VListItemTitle>
        </VListItem>
      </template>
    </VList>
  </VCard>
</template>
