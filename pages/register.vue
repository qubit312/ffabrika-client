<script setup lang="ts">
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import authV2IllustrationBorderedDark from '@images/pages/auth-v2-register-illustration-bordered-dark.png'
import authV2IllustrationBorderedLight from '@images/pages/auth-v2-register-illustration-bordered-light.png'
import authV2IllustrationDark from '@images/pages/auth-v2-register-illustration-dark.png'
import authV2IllustrationLight from '@images/pages/auth-v2-register-illustration-light.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useRouter } from 'vue-router'
import { apiLogin, apiRegister, setAuthSession, type RegisterDto } from '~/services/auth'

definePageMeta({
  layout: 'blank',
  public: true,
})

const router = useRouter()

const form = reactive<RegisterDto>({
  name: '',
  email: '',
  password: '',
  password_repeat: '',
})

const isPwd1 = ref(false)
const isPwd2 = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const authThemeImg = useGenerateImageVariant(
  authV2IllustrationLight,
  authV2IllustrationDark,
  authV2IllustrationBorderedLight,
  authV2IllustrationBorderedDark,
  true,
)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const MIN_PASSWORD = 11
const rules = {
  required: (v: any) => (!!v || v === false) || 'Обязательное поле',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Неверный email',
  minLen: (v: string) => (v?.length ?? 0) >= MIN_PASSWORD || `Минимум ${MIN_PASSWORD} символов`,
  samePwd: () => form.password === form.password_repeat || 'Пароли не совпадают',
}


async function onSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.name || !rules.email(form.email) || !rules.minLen(form.password) || !rules.samePwd()) {
    errorMessage.value = 'Проверьте правильность заполнения полей'
    return
  }

  loading.value = true
  try {
    const { data: regData, error: regErr } = await apiRegister(form)
    const reg = regData.value
    if (!reg || !reg.success === false) {
      throw new Error((regErr.value as any)?.data?.message || reg?.message || 'Ошибка регистрации')
    }

    const { data: loginData, error: loginErr } = await apiLogin({
      email: form.email,
      password: form.password,
      remember: true,
    })
    const login = loginData.value
    if (!login || !login.success || !login.data?.access_token) {
      throw new Error((loginErr.value as any)?.data?.message || login?.message || 'Ошибка авторизации после регистрации')
    }

    setAuthSession(login.data)
    await router.push('/')
  } catch (e: any) {
    errorMessage.value = e?.message || 'Ошибка регистрации'
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
          <h4 class="text-h4 mb-1">Регистрация в <span class="text-capitalize">{{ themeConfig.app.title }}</span></h4>
          <p class="mb-0">Создайте аккаунт, чтобы продолжить.</p>
        </VCardText>

        <VCardText>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="form.name" label="Имя" :rules="[rules.required]" />
              </VCol>

              <VCol cols="12">
                <AppTextField v-model="form.email" label="Email" type="email" :rules="[rules.required, rules.email]" />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Пароль"
                  placeholder="············"
                  :type="isPwd1 ? 'text' : 'password'"
                  :append-inner-icon="isPwd1 ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[rules.required, rules.min6]"
                  @click:append-inner="isPwd1 = !isPwd1"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.password_repeat"
                  label="Повторите пароль"
                  placeholder="············"
                  :type="isPwd2 ? 'text' : 'password'"
                  :append-inner-icon="isPwd2 ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="[rules.required, rules.min6, rules.samePwd]"
                  @click:append-inner="isPwd2 = !isPwd2"
                />
              </VCol>

              <VCol cols="12">
                <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>
                <VAlert v-if="successMessage" color="success" variant="tonal" class="mb-4">{{ successMessage }}</VAlert>

                <VBtn block type="submit" :loading="loading">Зарегистрироваться</VBtn>

                <div class="d-flex align-center justify-center mt-4">
                  <span class="me-1 text-medium-emphasis">Уже есть аккаунт?</span>
                  <NuxtLink to="/login">Войти</NuxtLink>
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
