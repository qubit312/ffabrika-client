<script setup lang="ts">
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-login-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-login-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useRoute, useRouter } from 'vue-router'
import { apiLogin, setAuthSession } from '~/services/auth'

definePageMeta({
  layout: 'blank',
  public: true,
})

const route = useRoute()
const router = useRouter()

const form = ref({
  email: '',
  password: '',
  remember: false,
})

const isPasswordVisible = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const isInvited = computed(() => String(route.query.invited ?? '').toLowerCase() === 'true')
const invitedOrgName = ref<string>('')

onMounted(() => {
  invitedOrgName.value = localStorage.getItem('invite_org_name') || ''
})

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await apiLogin({
      email: form.value.email,
      password: form.value.password,
      remember: form.value.remember,
    })

    const res = data.value
    if (!res || !res.success) {
      throw new Error((error.value as any)?.data?.message || res?.message || 'Ошибка авторизации')
    }

    setAuthSession(res.data)

    const invited = isInvited.value
    await router.push(invited ? '/invite' : '/')
  } catch (err: any) {
    errorMessage.value = 'Неправильно введены учетные данные'
    console.error(err?.message || err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NuxtLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
    </div>
  </NuxtLink>

  <VRow no-gutters class="auth-wrapper bg-surface">
    <VCol md="8" class="d-none d-md-flex">
      <div class="position-relative bg-background w-100 me-0">
        <div class="d-flex align-center justify-center w-100 h-100" style="padding-inline: 6.25rem;">
          <VImg max-width="613" :src="authThemeImg" class="auth-illustration mt-16 mb-2" />
        </div>
        <img class="auth-footer-mask" :src="authThemeMask" alt="auth-footer-mask" height="280" width="100" />
      </div>
    </VCol>

    <VCol cols="12" md="4" class="auth-card-v2 d-flex align-center justify-center">
      <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-4">
        <VCardText>
          <h4 class="text-h4 mb-1">
            С возвращением на <span class="text-capitalize">{{ themeConfig.app.title }}</span>! 👋🏻
          </h4>
          <VAlert
            v-if="isInvited"
            variant="tonal"
            type="info"
            class="mt-4"
          >
            Войдите в свой аккаунт, чтобы принять приглашение в
            <b>{{ invitedOrgName || 'компанию' }}</b>.
          </VAlert>
        </VCardText>

        <VCardText>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  autofocus
                  label="Email"
                  type="email"
                  placeholder="example@email.com"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Пароль"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />
              </VCol>

              <VCol cols="12" class="d-flex align-center justify-space-between">
                <VCheckbox
                  v-model="form.remember"
                  density="compact"
                  hide-details
                  label="Запомнить меня"
                />
                <NuxtLink to="/reset-password">Забыли пароль?</NuxtLink>
              </VCol>

              <VCol cols="12">
                <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-6">
                  {{ errorMessage }}
                </VAlert>

                <VBtn block type="submit" :loading="loading">
                  Войти
                </VBtn>

                <div class="d-flex align-center justify-center mt-4">
                  <span class="me-1 text-medium-emphasis">Нет аккаунта?</span>
                  <NuxtLink :to="isInvited ? { path: '/register', query: { invited: 'true' } } : { path: '/register' }">
                    Зарегистрироваться
                  </NuxtLink>
                </div>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
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
