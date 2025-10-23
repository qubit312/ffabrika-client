<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue'
import { useCurrentClient } from '@/composables/useCurrentClient'
import { useCookie } from 'nuxt/app'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleLogout = () => {
  const { setClient, clearClient } = useCurrentClient()
  clearClient()
  setClient(null)

  localStorage.clear()

  const token = useCookie('access_token')
  token.value = null

  router.push('/login')
}

const userName = ref('Гость')
const userLastName = ref('')
const userRole = ref('Без роли')
const userId = ref<number | null>(null)

onMounted(() => {
  const name = localStorage.getItem('user_name')
  const lastName = localStorage.getItem('user_last_name')
  const role = localStorage.getItem('role_visible_name')
  const id = localStorage.getItem('user_id')

  if (name) userName.value = name
  if (lastName) userLastName.value = lastName
  if (role) userRole.value = role
  if (id) userId.value = Number(id)
})

const isSuperUser = computed(() => userId.value === 1)
</script>

<template>
  <VBadge dot location="bottom right" offset-x="3" offset-y="3" bordered color="success">
    <div class="cursor-pointer">
      <UserAvatar
        :name="userName"
        :last-name="userLastName"
        size="40"
        rounded="circle"
        :font-size="18"
      />

      <VMenu activator="parent" width="230" location="bottom end" offset="14px">
        <VList>
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge dot location="bottom right" offset-x="3" offset-y="3" color="success">
                  <UserAvatar
                    :name="userName"
                    :last-name="userLastName"
                    size="40"
                    rounded="circle"
                    :font-size="18"
                  />
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">{{ userName }}</VListItemTitle>
            <VListItemSubtitle>{{ userRole }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />

          <VListItem :to="{ path: '/personal' }">
            <template #prepend><VIcon class="me-2" icon="tabler-user-circle" size="22" /></template>
            <VListItemTitle>Профиль</VListItemTitle>
          </VListItem>

          <VListItem :to="{ path: '/account/users' }">
            <template #prepend><VIcon class="me-2" icon="tabler-building" size="22" /></template>
            <VListItemTitle>Организация</VListItemTitle>
          </VListItem>

          <VListItem :to="{ path: '/shops' }">
            <template #prepend><VIcon class="me-2" icon="tabler-building-store" size="22" /></template>
            <VListItemTitle>Магазины</VListItemTitle>
          </VListItem>

          <VListItem v-if="isSuperUser" :to="{ path: '/legal' }">
            <template #prepend><VIcon class="me-2" icon="tabler-file-description" size="22" /></template>
            <VListItemTitle>Юридические документы</VListItemTitle>
          </VListItem>

          <VListItem v-if="isSuperUser" :to="{ path: '/all-users' }">
            <template #prepend><VIcon class="me-2" icon="tabler-users-group" size="22" /></template>
            <VListItemTitle>Все пользователи</VListItemTitle>
          </VListItem>

          <VListItem :to="{ path: '/offer' }">
            <template #prepend><VIcon class="me-2" icon="tabler-file-text" size="22" /></template>
            <VListItemTitle>Публичная оферта</VListItemTitle>
          </VListItem>

          <VDivider class="my-2" />

          <!-- Выход -->
          <VListItem @click="handleLogout">
            <template #prepend><VIcon class="me-2" icon="tabler-logout" size="22" /></template>
            <VListItemTitle>Выход</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </div>
  </VBadge>
</template>
