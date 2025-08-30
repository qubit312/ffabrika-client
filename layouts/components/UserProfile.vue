<script setup lang="ts">
import avatar1 from '@images/avatars/avatar-1.png';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const handleLogout = () => {
  localStorage.clear()
  const token = useCookie('access_token')
  token.value = null
  router.push('/login')
}

const userName = ref('Гость')
const userRole = ref('Без роли')

onMounted(() => {
  const name = localStorage.getItem('user_name')
  const role = localStorage.getItem('role_visible_name')

  if (name) userName.value = name
  if (role) userRole.value = role
})
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    bordered
    color="success"
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VImg :src="avatar1" />

      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    <VImg :src="avatar1" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ userName }}
            </VListItemTitle>
            <VListItemSubtitle>{{ userRole }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />
          <VListItem :to="{ path: '/account/personal' }">
            <template #prepend>
              <VIcon class="me-2" icon="tabler-user-circle" size="22" />
            </template>
            <VListItemTitle>Личный кабинет</VListItemTitle>
          </VListItem>
          <VDivider class="my-2" />

          <VListItem @click="handleLogout">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="tabler-logout"
                size="22"
              />
            </template>

            <VListItemTitle>Выход</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </VAvatar>
  </VBadge>
</template>
