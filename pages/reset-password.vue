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
import { useRoute, useRouter } from 'vue-router'
import { apiConfirmReset, apiResetPassword } from '~/services/auth'
import { checkPassword, type PasswordPolicy } from '~/utils/validators'

definePageMeta({ layout: 'blank', public: true })

const route = useRoute()
const router = useRouter()

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const token = ref<string>(String(route.query.token || ''))
const emailFromLink = ref<string>(String(route.query.email || ''))
const isResetMode = computed(() => !!token.value)

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const email = ref('')

const submittedRequest = ref(false)
const requestErrors = reactive<{ email: string[] }>({ email: [] })

function validateRequest() {
  requestErrors.email = []
  const e = String(email.value || '').trim().toLowerCase()
  if (!e) requestErrors.email.push('Обязательное поле')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) requestErrors.email.push('Неверный email')
  return requestErrors.email.length === 0
}

async function submitRequest() {
  submittedRequest.value = true
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateRequest()) return

  loading.value = true
  try {
    const { data, error } = await apiResetPassword({ email: email.value })
    const res = data.value
    if (!res || !res.success) {
      throw new Error((error.value as any)?.data?.message || res?.message || 'Ошибка')
    }
    successMessage.value = 'Если такой email зарегистрирован, мы отправили инструкцию по восстановлению.'
    
    // setTimeout(() => router.push('/login'), 1500)
  } catch (e: any) {
    errorMessage.value = e?.message || 'Ошибка запроса'
  } finally {
    loading.value = false
  }
}

const resetForm = reactive({
  email: emailFromLink.value,
  password: '',
  password_repeat: '',
})
const isPwd1 = ref(false)
const isPwd2 = ref(false)

const PWD_POLICY: PasswordPolicy = { min: 6, requireLower: true, requireDigit: true }
const pwdCheck = computed(() => checkPassword(resetForm.password, PWD_POLICY))

const submittedReset = ref(false)
const resetErrors = reactive<{ password: string[]; password_repeat: string[] }>({
  password: [],
  password_repeat: [],
})

function validateReset() {
  resetErrors.password = []
  resetErrors.password_repeat = []

  const pass = String(resetForm.password || '')
  const pass2 = String(resetForm.password_repeat || '')
  const policy = checkPassword(pass, PWD_POLICY)

  if (!pass) resetErrors.password.push('Обязательное поле')
  else if (!policy.ok) {
    if (!policy.len) resetErrors.password.push(`Не менее ${PWD_POLICY.min} символов`)
    if (!policy.digit) resetErrors.password.push('Хотя бы одна цифра')
    if (!policy.lower) resetErrors.password.push('Хотя бы одна буква')
  }

  if (!pass2) resetErrors.password_repeat.push('Обязательное поле')
  else if (pass2 !== pass) resetErrors.password_repeat.push('Пароли не совпадают')

  return resetErrors.password.length === 0 && resetErrors.password_repeat.length === 0
}

async function submitReset() {
  submittedReset.value = true
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateReset()) return

  loading.value = true
  try {
    const { data, error } = await apiConfirmReset({
      token: token.value,
      email: resetForm.email,
      password: resetForm.password,
      password_confirmation: resetForm.password_repeat,
    })
    const res = data.value
    if (!res || !res.success) {
      throw new Error((error.value as any)?.data?.message || res?.message || 'Не удалось изменить пароль')
    }
    successMessage.value = 'Пароль успешно изменён. Перенаправляем на вход…'
    setTimeout(() => router.push('/login'), 1500)
  } catch (e: any) {
    errorMessage.value = e?.message || 'Ошибка изменения пароля'
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
          <template v-if="!isResetMode">
            <h4 class="text-h4 mb-1">Восстановление пароля</h4>
            <p class="mb-0">Укажите email — пришлём инструкции по сбросу.</p>
          </template>
          <template v-else>
            <h4 class="text-h4 mb-1">Сброс пароля</h4>
            <p class="mb-0">Задайте новый пароль для аккаунта.</p>
          </template>
        </VCardText>

        <VCardText>
          <template v-if="!isResetMode">
            <VForm @submit.prevent="submitRequest">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="email"
                    label="Email"
                    type="email"
                    :error-messages="submittedRequest ? requestErrors.email : []"
                    autocomplete="email"
                  />
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
          </template>

          <template v-else>
            <VForm @submit.prevent="submitReset">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="resetForm.email"
                    label="Email"
                    type="email"
                    autocomplete="email"
                    readonly
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model="resetForm.password"
                    label="Новый пароль"
                    placeholder="············"
                    :type="isPwd1 ? 'text' : 'password'"
                    :append-inner-icon="isPwd1 ? 'tabler-eye-off' : 'tabler-eye'"
                    @click:append-inner="isPwd1 = !isPwd1"
                    autocomplete="new-password"
                    :error-messages="submittedReset ? resetErrors.password : []"
                  />
                </VCol>

                <VCol cols="12">
                  <AppTextField
                    v-model="resetForm.password_repeat"
                    label="Повторите пароль"
                    placeholder="············"
                    :type="isPwd2 ? 'text' : 'password'"
                    :append-inner-icon="isPwd2 ? 'tabler-eye-off' : 'tabler-eye'"
                    @click:append-inner="isPwd2 = !isPwd2"
                    autocomplete="new-password"
                    :error-messages="submittedReset ? resetErrors.password_repeat : []"
                  />
                </VCol>

                <VCol cols="12">
                  <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>
                  <VAlert v-if="successMessage" color="success" variant="tonal" class="mb-4">{{ successMessage }}</VAlert>

                  <VBtn block type="submit" :loading="loading">Сохранить пароль</VBtn>

                  <div class="d-flex align-center justify-center mt-4">
                    <NuxtLink to="/login">Назад ко входу</NuxtLink>
                  </div>
                </VCol>
              </VRow>
            </VForm>
          </template>
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
