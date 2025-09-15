<script setup lang="ts">
import { useCurrentClient } from '@/composables/useCurrentClient';
import avatar1 from '@images/avatars/avatar-1.png';
import { useCookie, useRuntimeConfig } from 'nuxt/app';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

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
const userRole = ref('Без роли')
const defaultAvatar = avatar1 as string
const avatarSrc = ref<string>(defaultAvatar)

function buildUrlFromRaw(raw: string) {
  if (!raw) return defaultAvatar
  if (/^https?:\/\//i.test(raw)) return raw
  const cfg = useRuntimeConfig()
  const origin = cfg.public?.backendOrigin || 'http://127.0.0.1:8000'
  return `${origin}/storage/${raw.replace(/^\/+/, '')}`
}

const onImgError = () => { avatarSrc.value = defaultAvatar }

onMounted(() => {
  const name = localStorage.getItem('user_name')
  const role = localStorage.getItem('role_visible_name')
  if (name) userName.value = name
  if (role) userRole.value = role

  const url = localStorage.getItem('user_avatar_url')
  const raw = localStorage.getItem('user_avatar')
  avatarSrc.value = url || (raw ? buildUrlFromRaw(raw) : defaultAvatar)
})
</script>

<template>
  <VBadge dot location="bottom right" offset-x="3" offset-y="3" bordered color="success">
    <VAvatar class="cursor-pointer" color="primary" variant="tonal">
      <VImg :src="avatarSrc" @error="onImgError" />

      <VMenu activator="parent" width="230" location="bottom end" offset="14px">
        <VList>
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge dot location="bottom right" offset-x="3" offset-y="3" color="success">
                  <VAvatar color="primary" variant="tonal">
                    <VImg :src="avatarSrc" @error="onImgError" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">{{ userName }}</VListItemTitle>
            <VListItemSubtitle>{{ userRole }}</VListItemSubtitle>
          </VListItem>

          <VDivider class="my-2" />
          <VListItem :to="{ path: '/account/personal' }">
            <template #prepend><VIcon class="me-2" icon="tabler-user-circle" size="22" /></template>
            <VListItemTitle>Личный кабинет</VListItemTitle>
          </VListItem>

          <VDivider class="my-2" />
          <VListItem @click="handleLogout">
            <template #prepend><VIcon class="me-2" icon="tabler-logout" size="22" /></template>
            <VListItemTitle>Выход</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </VAvatar>
  </VBadge>
</template>
