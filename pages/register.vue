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
import { useRoute, useRouter } from 'vue-router'
import { apiLogin, apiRegister, setAuthSession, type RegisterDto } from '~/services/auth'
import { checkPassword, email as emailRule, passwordRule, required, type PasswordPolicy } from '~/utils/validators'

definePageMeta({ layout: 'blank', public: true })

const route = useRoute()
const router = useRouter()

const isInvited = computed(() => String(route.query.invited ?? '').toLowerCase() === 'true')
const invitedOrgName = ref<string>('')

onMounted(() => {
  invitedOrgName.value = localStorage.getItem('invite_org_name') || ''
})

const form = reactive<RegisterDto>({
  name: '',
  email: '',
  password: '',
  password_repeat: '',
  agreeOffer: false,
})

const isPwd1 = ref(false)
const isPwd2 = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const submitted = ref(false)

const snackbar = ref({ visible: false, text: '', color: 'success', timeout: 2500 })

const authThemeImg = useGenerateImageVariant(
  authV2IllustrationLight, authV2IllustrationDark,
  authV2IllustrationBorderedLight, authV2IllustrationBorderedDark, true,
)
const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const PWD_POLICY: PasswordPolicy = { min: 6, requireLower: true, requireDigit: true }
const rules = {
  required,
  email: emailRule,
  password: passwordRule(PWD_POLICY),
  repeat: (v: string) => String(v ?? '') === String(form.password ?? '') || 'Пароли не совпадают',
  agree: (v: boolean) => v === true || 'Необходимо согласие с офертой',
}

const nameRules = computed(() => (submitted.value ? [rules.required] : []))
const emailRules = computed(() => (submitted.value ? [rules.required, rules.email] : []))
const passRules = computed(() => (submitted.value ? [rules.required, rules.password] : []))
const repeatRules = computed(() => (submitted.value ? [rules.required, rules.repeat] : []))
const agreeRules = computed(() => (submitted.value ? [rules.agree] : []))

const pwdCheck = computed(() => checkPassword(form.password, PWD_POLICY))
const showPwdHelp = computed(() => {
  const typed = (form.password?.length ?? 0) > 0
  const valid = rules.password(form.password) === true
  return (!valid && (typed || submitted.value))
})

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

async function onSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  submitted.value = true

  const localOk =
    rules.required(form.name) === true &&
    rules.required(form.email) === true &&
    rules.email(form.email) === true &&
    rules.password(form.password) === true &&
        rules.repeat(form.password_repeat) === true &&
    rules.agree(form.agreeOffer) === true

  if (!localOk) {
    errorMessage.value = 'Проверьте правильность заполнения полей'
    return
  }

  loading.value = true
  try {
    const regPayload: RegisterDto & { invited?: boolean } = {
      ...form,
      invited: isInvited.value || undefined,
    }

    const { data: regData, error: regErr } = await apiRegister(regPayload as any)
    const reg = regData.value
    if (!reg || reg.success === false) {
      throw new Error((regErr.value as any)?.data?.message || reg?.message || 'Ошибка регистрации')
    }

    snackbar.value = { visible: true, text: 'Регистрация успешна! Выполняем вход…', color: 'success', timeout: 2500 }
    await sleep(900)

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

    await router.push(isInvited.value ? '/invite' : '/')
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

          <VAlert v-if="isInvited" variant="tonal" type="info" class="mt-4">
            Зарегистрируйтесь, чтобы принять приглашение в
            <b>{{ invitedOrgName || 'организацию' }}</b>.
          </VAlert>
        </VCardText>

        <VCardText>
          <VForm autocomplete="off" validate-on="submit" @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.name"
                  label="Имя"
                  :rules="nameRules"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  label="Email"
                  type="email"
                  :rules="emailRules"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Пароль"
                  placeholder="············"
                  :type="isPwd1 ? 'text' : 'password'"
                  :append-inner-icon="isPwd1 ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="passRules"
                  autocomplete="new-password"
                  @click:append-inner="isPwd1 = !isPwd1"
                />
                <div v-if="showPwdHelp" class="text-caption mt-2 d-flex flex-column gap-1">
                  <div class="d-flex align-center gap-2">
                    <VIcon :color="pwdCheck.len ? 'success' : 'error'" :icon="pwdCheck.len ? 'tabler-check' : 'tabler-x'" size="16" />
                    <span>Не менее {{ PWD_POLICY.min }} символов</span>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <VIcon :color="pwdCheck.digit ? 'success' : 'error'" :icon="pwdCheck.digit ? 'tabler-check' : 'tabler-x'" size="16" />
                    <span>Хотя бы одна цифра</span>
                  </div>
                  <div class="d-flex align-center gap-2">
                    <VIcon :color="pwdCheck.lower ? 'success' : 'error'" :icon="pwdCheck.lower ? 'tabler-check' : 'tabler-x'" size="16" />
                    <span>Хотя бы одна буква</span>
                  </div>
                </div>
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="form.password_repeat"
                  label="Повторите пароль"
                  placeholder="············"
                  :type="isPwd2 ? 'text' : 'password'"
                  :append-inner-icon="isPwd2 ? 'tabler-eye-off' : 'tabler-eye'"
                  :rules="repeatRules"
                  autocomplete="new-password"
                  @click:append-inner="isPwd2 = !isPwd2"
                />
              </VCol>

              <VCol cols="12">
                <VAlert v-if="errorMessage" color="error" variant="tonal" class="mb-4">{{ errorMessage }}</VAlert>
                <VAlert v-if="successMessage" color="success" variant="tonal" class="mb-4">{{ successMessage }}</VAlert>
                <VCol cols="12">
                  <VCheckbox
                    v-model="form.agreeOffer"
                    :rules="agreeRules"
                    :error="submitted && !form.agreeOffer"
                    density="comfortable"
                  >
                    <template #label>
                      <span>
                        Я принимаю условия
                        <NuxtLink
                          :to="{ path: '/offer', query: { from: 'register' } }"
                          class="text-primary"
                          target="_blank"
                          @click.stop
                          @mousedown.stop

                        >
                          Публичной оферты
                        </NuxtLink>
                      </span>
                    </template>
                  </VCheckbox>
                </VCol>

                <VBtn block type="submit" :loading="loading" :disabled="!form.agreeOffer">Зарегистрироваться</VBtn>

                <div v-if="!isInvited" class="d-flex align-center justify-center mt-4">
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

  <VSnackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color" location="top right">
    {{ snackbar.text }}
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
