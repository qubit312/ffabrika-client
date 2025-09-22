<script setup lang="ts">
import authTwoStepDark from '@/assets/images/pages/auth-v2-two-step-illustration-dark.png'
import authTwoStepLight from '@/assets/images/pages/auth-v2-two-step-illustration-light.png'
import authMaskDark from '@/assets/images/pages/misc-mask-dark.png'
import authMaskLight from '@/assets/images/pages/misc-mask-light.png'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { acceptInvitation } from '~/services/users'

definePageMeta({ layout: 'blank', public: true })

const route = useRoute()
const router = useRouter()

const LS_INVITE_TOKEN   = 'invite_token'
const LS_INVITE_ORGNAME = 'invite_org_name'
const LS_INVITE_IS_NEW  = 'invite_is_new' 

const authThemeImg  = useGenerateImageVariant(authTwoStepLight, authTwoStepDark, authTwoStepLight, authTwoStepDark, true)
const authThemeMask = useGenerateImageVariant(authMaskLight, authMaskDark)

const loading = ref(false)
const alert = reactive<{ type: 'success' | 'error' | 'info' | 'warning' | null; text: string }>({ type: null, text: '' })
const snack  = reactive({ show: false, color: 'success' as 'success' | 'error' | 'info' | 'warning', text: '', timeout: 2500 })

function showSnack(text: string, color: 'success' | 'error' | 'info' | 'warning' = 'success') {
  snack.text = text
  snack.color = color
  snack.show = true
}

function isAuthenticated() {
  return !!(localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
}

function saveInviteToLs(token: string, org: string, isNew?: string) {
  if (token) localStorage.setItem(LS_INVITE_TOKEN, token)
  if (org)   localStorage.setItem(LS_INVITE_ORGNAME, org)
  if (isNew !== undefined) localStorage.setItem(LS_INVITE_IS_NEW, String(isNew))
}

function getInviteToken(): string {
  return localStorage.getItem(LS_INVITE_TOKEN) || ''
}
function getInviteOrg(): string {
  return localStorage.getItem(LS_INVITE_ORGNAME) || ''
}
function getInviteIsNew(): boolean {
  return (localStorage.getItem(LS_INVITE_IS_NEW) || '').toLowerCase() === 'true'
}

function clearInviteLs() {
  localStorage.removeItem(LS_INVITE_TOKEN)
  localStorage.removeItem(LS_INVITE_ORGNAME)
  localStorage.removeItem(LS_INVITE_IS_NEW)
}

const orgName = ref<string>('')

onMounted(() => {
  const qToken = String(route.query.token ?? '')
  const qOrg   = String(route.query.org_name ?? '')
  const qIsNew = String(route.query.is_new ?? '')

  if (qToken || qOrg || qIsNew) {
    saveInviteToLs(qToken, qOrg, qIsNew)
  }

  orgName.value = getInviteOrg()
  const token = getInviteToken()
  const isNewUser = getInviteIsNew()

  if (!token) {
    alert.type = 'error'
    alert.text = 'Не найден токен приглашения'
    showSnack('Токен отсутствует', 'error')
    setTimeout(() => router.replace({ path: '/' }), 500)
    return
  }

  if (!isAuthenticated()) {
    if (isNewUser) router.replace({ path: '/register', query: { invited: 'true' } })
    else router.replace({ path: '/login', query: { invited: 'true' } })
  }
})

async function acceptInvite() {
  const token = getInviteToken()
  if (!token) {
    alert.type = 'error'
    alert.text = 'Не найден токен приглашения'
    showSnack('Токен отсутствует', 'error')
    return
  }

  loading.value = true
  try {
    const { data, error } = await acceptInvitation(token)
    if (error.value || !data.value?.success) {
      throw new Error(data.value?.message || 'Не удалось подтвердить приглашение')
    }

    alert.type = 'success'
    alert.text = `Приглашение подтверждено. Добро пожаловать в ${orgName.value || 'организацию'}!`
    showSnack('Участие подтверждено')

    clearInviteLs()

    setTimeout(() => router.replace({ path: '/' }), 400)
  } catch (e: any) {
    alert.type = 'error'
    alert.text = e?.message || 'Не удалось подтвердить приглашение'
    showSnack('Ошибка подтверждения', 'error')
  } finally {
    loading.value = false
  }
}

function declineInvite() {
  clearInviteLs()
  alert.type = 'warning'
  alert.text = 'Вы отклонили приглашение. Если это ошибка — обратитесь к отправителю.'
  showSnack('Приглашение отклонено', 'warning')
  setTimeout(() => router.replace({ path: '/' }), 400)
}
</script>

<template>
  <NuxtLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
    </div>
  </NuxtLink>

  <VRow no-gutters class="auth-wrapper bg-surface">
    <VCol md="8" class="d-none d-md-flex auth-left">
      <div class="position-relative bg-background w-100 h-100">
        <div class="d-flex align-center justify-center w-100 h-100" style="padding-inline: 6.25rem;">
          <VImg max-width="613" :src="authThemeImg" class="auth-illustration" />
        </div>
        <img class="auth-footer-mask" :src="authThemeMask" alt="auth-footer-mask" height="280" width="100" />
      </div>
    </VCol>
    <VCol cols="12" md="4" class="auth-card-v2 d-flex align-center justify-center">
      <VCard flat :max-width="520" class="mt-12 mt-sm-0 pa-4">
        <VCardText class="pb-1">
          <h4 class="text-h4 mb-2">Здравствуйте!</h4>
          <p class="mb-1">
            Вам отправлено приглашение в организацию <b>{{ orgName || '—' }}</b>.
          </p>
          <p class="mb-0">Вы подтверждаете своё участие?</p>
        </VCardText>

        <VCardText>
          <VAlert v-if="alert.type" :type="alert.type" variant="tonal" class="mb-4">
            {{ alert.text }}
          </VAlert>

          <div class="d-flex flex-wrap gap-3">
            <VBtn color="primary" prepend-icon="tabler-check" :loading="loading" @click="acceptInvite">
              Да, подтвердить
            </VBtn>

            <VBtn color="secondary" variant="outlined" prepend-icon="tabler-x" :loading="loading" @click="declineInvite">
              Нет
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VSnackbar v-model="snack.show" :color="snack.color" :timeout="snack.timeout" location="top right">
    {{ snack.text }}
  </VSnackbar>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";

.auth-wrapper { min-height: 100vh; }

@media (min-width: 960px) {
  html, body { height: 100%; }
  .auth-wrapper { height: 100vh; overflow: hidden; }
  .auth-left { position: relative; height: 100vh; overflow: hidden; }
  .auth-left > .position-relative { height: 100%; }
  .auth-illustration { max-height: 70vh; width: auto; }
  .auth-footer-mask { position: absolute; bottom: 0; left: 0; width: 100%; height: 220px; object-fit: cover; }
  .auth-card-v2 { min-height: 100vh; }
  .auth-card-v2 .v-card { margin-top: 0 !important; }
}
</style>
