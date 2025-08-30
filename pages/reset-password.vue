<script setup lang="ts">
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2LoginIllustrationDark from '@images/pages/auth-v2-forgot-password-illustration-dark.png'
import authV2LoginIllustrationLight from '@images/pages/auth-v2-forgot-password-illustration-light.png'
import authV2LoginIllustrationBorderedDark from '@images/pages/auth-v2-login-illustration-bordered-dark.png'
import authV2LoginIllustrationBorderedLight from '@images/pages/auth-v2-login-illustration-bordered-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useRouter } from 'vue-router'
import { apiResetPassword } from '~/services/auth'

definePageMeta({ layout: 'blank', public: true })

const router = useRouter()
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const rules = {
  required: (v: string) => !!v || 'Обязательное поле',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Неверный email',
}

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data, error } = await apiResetPassword({ email: email.value })
    const res = data.value
    if (!res || !res.success)
      throw new Error((error.value as any)?.data?.message || res?.message || 'Ошибка')

    successMessage.value = 'Если такой email зарегистрирован, мы отправили инструкцию по восстановлению.'
    setTimeout(() => router.push('/login'), 1500)
  } catch (e: any) {
    errorMessage.value = e?.message || 'Ошибка запроса'
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
    <VCol md="8" class="d-none d-md-flex auth-left">
      <div class="position-relative bg-background w-100 h-100">
        <div class="d-flex align-center justify-center w-100 h-100" style="padding-inline: 6.25rem;">
          <VImg max-width="613" :src="authThemeImg" class="auth-illustration" />
        </div>
        <img class="auth-footer-mask" :src="authThemeMask" alt="auth-footer-mask" height="280" width="100">
      </div>
    </VCol>

    <VCol cols="12" md="4" class="auth-card-v2 d-flex align-center justify-center">
      <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-4">
        <VCardText>
          <h4 class="text-h4 mb-1">Восстановление пароля</h4>
          <p class="mb-0">Укажите email — пришлём инструкции по сбросу.</p>
        </VCardText>

        <VCardText>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="email" label="Email" type="email" :rules="[rules.required, rules.email]" />
              </VCol>

              <VCol cols="12">
                <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>
                <VAlert v-if="successMessage" color="success" variant="tonal" class="mb-4">{{ successMessage }}</VAlert>

                <VBtn block type="submit" :loading="loading">Отправить</VBtn>

                <div class="d-flex align-center justify-center mt-4 gap-3">
                  <NuxtLink to="/login">Назад ко входу</NuxtLink>
                  <span class="text-medium-emphasis">•</span>
                  <NuxtLink to="/register">Регистрация</NuxtLink>
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
