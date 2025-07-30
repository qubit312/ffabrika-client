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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'blank',
  public: true,
})

const form = ref({
  email: '',
  password: '',
  remember: false,
})
const config = useRuntimeConfig()
const isPasswordVisible = ref(false)
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')

const authThemeImg = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await useApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.value.email,
        password: form.value.password,
        remember: form.value.remember
      })
    })

    const payload = data.value
    if (!payload || !payload.success) {
      console.error(error.value.data.message || 'Ошибка сети')
      throw new Error(payload.message || 'Ошибка авторизации')
    }
    localStorage.setItem('access_token', payload.data.access_token)
    const cookie = useCookie('access_token', { maxAge: 60 * 60 * 24 })
    cookie.value = payload.data.access_token
    
    localStorage.setItem('user_name', payload.data.name)
    const role = payload.data.role
    if (role) {
      localStorage.setItem('role_visible_name', role.visible_name)
    }
    
    await router.push('/')
  } catch (err: any) {
    errorMessage.value = "Неправильно введены учетные данные"
    console.error(err.message || 'Ошибка сети')
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <NuxtLink to="/">
    <div class="auth-logo d-flex align-center gap-x-3">
      <VNodeRenderer :nodes="themeConfig.app.logo" />
      <h1 class="auth-title">
        {{ themeConfig.app.title }}
      </h1>
    </div>
  </NuxtLink>

  <VRow
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 me-0">
        <div
          class="d-flex align-center justify-center w-100 h-100"
          style="padding-inline: 6.25rem;"
        >
          <VImg
            max-width="613"
            :src="authThemeImg"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <img
          class="auth-footer-mask"
          :src="authThemeMask"
          alt="auth-footer-mask"
          height="280"
          width="100"
        >
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            С возвращением на <span class="text-capitalize"> {{ themeConfig.app.title }} </span>! 👋🏻
          </h4>
        </VCardText>
        
        <VCardText>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  autofocus
                  label="Email"
                  type="email"
                  placeholder="example@email.com"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Пароль"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="mt-2 mb-4">
                </div>

                <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-6">{{ errorMessage }}</VAlert>

                <VBtn
                  block
                  type="submit"
                  :loading="loading"
                >
                  Логин
                </VBtn>
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
</style>
