<script setup lang="ts">
import avatarFallback from '@images/avatars/avatar-1.png'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, getProfile, updateProfile } from '~/services/profile'
import {
  formatRuPhone,
  match,
  minLen,
  required,
  stripDigits
} from '~/utils/validators'

const router = useRouter()

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success' | 'error' = 'success') => { snack.text = t; snack.color = c; snack.show = true }

const isEdit = ref(false)
const isSaving = ref(false)
const userId = ref(0)
const submitted = ref(false)
const formRef = ref<any>(null)

const defaultAvatar = avatarFallback as string
const avatarUrl = ref<string>(localStorage.getItem('user_avatar_url') || defaultAvatar)
const originalAvatar = ref<string>(avatarUrl.value)
const fileInput = ref<HTMLInputElement | null>(null)
const avatarBase64 = ref<string | null>(null)

const pickFile = () => isEdit.value && fileInput.value?.click()
const onFile = (e: Event) => {
  if (!isEdit.value) return
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const isImage = /image\/(png|jpeg|jpg|gif)/i.test(file.type)
  const okSize = file.size <= 800 * 1024
  if (!isImage || !okSize) return notify('Разрешены JPG, GIF или PNG. Максимальный размер 800 КБ', 'error')

  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = String(reader.result || '')
    avatarBase64.value = dataUrl
    avatarUrl.value = dataUrl
  }
  reader.readAsDataURL(file)
}
const resetAvatar = () => {
  if (!isEdit.value) return
  avatarUrl.value = originalAvatar.value
  avatarBase64.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const form = reactive({
  name:       localStorage.getItem('user_name')        || '',
  lastName:   localStorage.getItem('user_last_name')   || '',
  email:      localStorage.getItem('user_email')       || '',
  phone: (() => {
    const raw = localStorage.getItem('user_phone') || ''
    const d = stripDigits(raw)
    return d ? formatRuPhone(d) : ''
  })(),
  address:    localStorage.getItem('user_address')     || '',
  telegram:   localStorage.getItem('user_telegram')    || '',
})

type Rule = (v: any) => true | string
function evalRules(rules: Rule[] | { value: Rule[] }, v: any): string[] {
  const arr = Array.isArray(rules) ? rules : rules.value
  return arr.map(r => r(v)).filter(r => r !== true) as string[]
}

function fieldState(rules: Rule[] | { value: Rule[] }, v: any, submitted: boolean) {
  const errs = evalRules(rules, v)
  return {
    hasError: submitted && errs.length > 0,
    errors: submitted ? errs : [],
    messages: !submitted && errs.length ? errs : [],
  }
}

const optionalEmail: Rule = v =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) || 'Некорректный формат email'

const telegramWithAt: Rule = v =>
  !v || /^@[A-Za-z0-9_]{1,32}$/.test(String(v)) || 'Укажите в формате @username (латиница, цифры, _, до 32 символов)'

const optionalRuPhone: Rule = v => {
  if (!v) return true
  const digits = stripDigits(String(v))
  return digits.length === 11 && /^[78]\d{10}$/.test(digits) ? true : 'Телефон в формате +7XXXXXXXXXX'
}

const rules = {
  name: [required],
  lastName: [],
  email: [optionalEmail],
  phone: [optionalRuPhone],
  address: [],
  telegram: [telegramWithAt],
}

function onPhoneInput(v: string) {
  let d = stripDigits(String(v || '')).slice(0, 11)
  if (d === '') { form.phone = ''; return }
  if (d[0] === '8') d = '7' + d.slice(1, 10)
  if (d[0] !== '7') d = '7' + d.slice(1, 10)
  form.phone = formatRuPhone(d)
}

function onTelegramInput(v: string) {
  let value = String(v || '').trim()
  if (value && !value.startsWith('@')) {
    value = '@' + value.replace(/^@+/, '')
  }
  form.telegram = value
}

async function loadProfile() {
  try {
    const { data, error } = await getProfile()
    if (!error.value && data.value?.success) {
      const u = data.value.data
      form.name = u.name || ''
      form.email = u.email || ''
      form.address = u.address || ''
      form.phone = u.phone ? formatRuPhone(stripDigits(u.phone)) : ''
      form.telegram = u.telegram || ''

      if (u.avatar) {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
        const url = `${base}/storage/${u.avatar}`
        localStorage.setItem('user_avatar_url', url)
        avatarUrl.value = url
      }
      originalAvatar.value = avatarUrl.value
    }
  } catch { }
}
onMounted(loadProfile)

const startEdit = () => { originalAvatar.value = avatarUrl.value; isEdit.value = true }
const cancel = () => {
  loadProfile()
  avatarBase64.value = null
  if (fileInput.value) fileInput.value.value = ''
  isEdit.value = false
  submitted.value = false
}

async function saveProfile() {
  submitted.value = true
  const res = await formRef.value?.validate?.()
  if (res && res.valid === false) return notify('Проверьте правильность заполнения полей', 'error')

  isSaving.value = true
  try {
    const payload: any = {
      name: form.name,
      email: form.email,
      address: form.address || null,
      phone: form.phone ? stripDigits(form.phone) : null,
      telegram: form.telegram || null,
      change_password: false,
    }
    if (avatarBase64.value) payload.avatar = avatarBase64.value

    const { data, error } = await updateProfile(payload)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось сохранить')

    localStorage.setItem('user_name', form.name || '')
    localStorage.setItem('user_last_name', form.lastName || '')
    localStorage.setItem('user_email', form.email || '')
    localStorage.setItem('user_address', form.address || '')
    localStorage.setItem('user_phone', payload.phone || '')
    localStorage.setItem('user_telegram', form.telegram || '')

    if (data.value.data?.avatar) {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      const url = `${base}/storage/${data.value.data.avatar}`
      localStorage.setItem('user_avatar_url', url)
      avatarUrl.value = url
    }

    avatarBase64.value = null
    if (fileInput.value) fileInput.value.value = ''
    isEdit.value = false
    submitted.value = false
    notify('Изменения сохранены')
  } catch (e: any) {
    notify(e?.message || 'Ошибка сохранения', 'error')
  } finally {
    isSaving.value = false
  }
}

const pwdEdit = ref(false)
const pwdFormRef = ref<any>(null)
const pwd = reactive({ current: '', p1: '', p2: '' })
const show = reactive({ current: false, p1: false, p2: false })

const pwChecks = computed(() => {
  const s = pwd.p1 || ''
  return {
    len: s.length >= 8,
    lower: /[a-z]/.test(s),
    complex: /\d/.test(s) || /[^\w]/.test(s) || /\s/.test(s),
  }
})
const pwdRules = {
  new: [required, minLen(8)],
  confirm: [required, match(() => pwd.p1, 'Пароли не совпадают')],
}
function resetPwdForm() { pwd.current = ''; pwd.p1 = ''; pwd.p2 = '' }

async function savePassword() {
  const res = await pwdFormRef.value?.validate?.()
  if (res && res.valid === false) return notify('Проверьте поля пароля', 'error')

  const c = pwChecks.value
  if (!c.len || !c.lower || !c.complex) return notify('Новый пароль не соответствует требованиям', 'error')

  try {
    // const { data, error } = await updateProfile({ change_password: true, password: pwd.p1 })
    const { data, error } = await changePassword({ current_password: pwd.current, new_password: pwd.p1, new_password_confirmation: pwd.p2 })
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось сменить пароль')
    resetPwdForm()
    pwdEdit.value = false
    notify('Пароль обновлён')
  } catch (e: any) {
    notify(e?.message || 'Ошибка смены пароля', 'error')
  }
}

const agreeDelete = ref(false)
const deleting = ref(false)
const confirmDeleteDialog = ref(false)
const openDeleteConfirm = () => { if (agreeDelete.value) confirmDeleteDialog.value = true }

async function doDeleteAccount() {
  deleting.value = true
  const id = userId.value;
  if (id) {
    return
  }

  try {
    // const { data, error } = await deleteUser(id)
    notify('Запрос на удаление аккаунта отправлен администратору')
    confirmDeleteDialog.value = false
    agreeDelete.value = false
  } catch (e: any) {
    notify(e?.message || 'Не удалось удалить аккаунт', 'error')
  } finally {
    deleting.value = false
  }
}

</script>

<template>
  <!-- Профиль -->
  <VCard :loading="isSaving" class="mb-4">
    <VCardText class="d-flex">
      <VAvatar rounded size="100" class="me-6" variant="flat">
        <VImg :src="avatarUrl" />
      </VAvatar>

      <form class="d-flex flex-column justify-center gap-4" @submit.prevent>
        <div class="d-flex flex-wrap gap-4">
          <VBtn size="small" color="primary" :disabled="!isEdit" @click="pickFile">
            <VIcon class="d-sm-none" icon="tabler-cloud-upload" />
            <span class="d-none d-sm-block">Загрузить фото</span>
          </VBtn>
          <input ref="fileInput" type="file" accept=".jpeg,.png,.jpg,.gif" hidden @change="onFile" />
          <VBtn size="small" variant="tonal" color="secondary" type="reset" :disabled="!isEdit" @click="resetAvatar">
            <span class="d-none d-sm-block">Сбросить</span>
            <VIcon class="d-sm-none" icon="tabler-refresh" />
          </VBtn>
        </div>
        <p class="text-body-1 mb-0">Разрешены JPG, GIF или PNG. Максимальный размер 800 КБ</p>
      </form>
    </VCardText>

    <VCardText class="pt-2">
      <VForm ref="formRef" class="mt-3" :validate-on="submitted ? 'input' : 'blur'" @submit.prevent="saveProfile">
        <VRow>
          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Имя</label>
            <VTextField
              v-model="form.name"
              placeholder="Ваше имя"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.name"
              v-bind="fieldState(rules.name, form.name, submitted)"
              :error="fieldState(rules.name, form.name, submitted).hasError"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Фамилия</label>
            <VTextField
              v-model="form.lastName"
              placeholder="Ваша фамилия"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.lastName"
              v-bind="fieldState(rules.lastName, form.lastName, submitted)"
              :error="fieldState(rules.lastName, form.lastName, submitted).hasError"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">E-mail</label>
            <VTextField
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.email"
              v-bind="fieldState(rules.email, form.email, submitted)"
              :error="fieldState(rules.email, form.email, submitted).hasError"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Telegram</label>
            <VTextField
              :model-value="form.telegram"
              placeholder="@username"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.telegram"
              v-bind="fieldState(rules.telegram, form.telegram, submitted)"
              :error="fieldState(rules.telegram, form.telegram, submitted).hasError"
              @update:model-value="onTelegramInput"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Телефон</label>
            <VTextField
              :model-value="form.phone"
              placeholder="+7 (___) ___-__-__"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.phone"
              inputmode="tel"
              maxlength="18"
              v-bind="fieldState(rules.phone, form.phone, submitted)"
              :error="fieldState(rules.phone, form.phone, submitted).hasError"
              @update:model-value="onPhoneInput"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Адрес</label>
            <VTextField
              v-model="form.address"
              placeholder="Город, улица, дом"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.address"
              v-bind="fieldState(rules.address, form.address, submitted)"
              :error="fieldState(rules.address, form.address, submitted).hasError"
            />
          </VCol>

          <VCol cols="12" class="d-flex flex-wrap gap-4">
            <VBtn v-if="!isEdit" color="primary" @click="startEdit">Редактировать</VBtn>
            <template v-else>
              <VBtn type="submit" color="primary" :loading="isSaving">Сохранить изменения</VBtn>
              <VBtn variant="tonal" color="secondary" @click="cancel">Отмена</VBtn>
            </template>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>

  <!-- Смена пароля-->
  <VCard class="mb-4">
    <VCardText>
      <div class="d-flex align-center justify-between mb-4">
        <h3 class="text-h5 mb-0">Изменить пароль</h3>
      </div>

      <VForm ref="pwdFormRef" @submit.prevent="savePassword">
        <VRow>
          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Текущий пароль</label>
            <VTextField
              v-model="pwd.current"
              :type="show.current ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              :append-inner-icon="show.current ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.current = !show.current"
            />
          </VCol>
          <VCol cols="12" md="6"></VCol>
          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Новый пароль</label>
            <VTextField
              v-model="pwd.p1"
              :type="show.p1 ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              :rules="pwdEdit ? pwdRules.new : []"
              :append-inner-icon="show.p1 ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.p1 = !show.p1"
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Подтвердите новый пароль</label>
            <VTextField
              v-model="pwd.p2"
              :type="show.p2 ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              :rules="pwdEdit ? pwdRules.confirm : []"
              :append-inner-icon="show.p2 ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.p2 = !show.p2"
            />
          </VCol>

          <VCol cols="12">
            <div class="text-body-1 mb-2">Требования к паролю:</div>
            <ul class="requirements">
              <li :class="{ ok: pwChecks.len }">Минимум 8 символов — чем больше, тем лучше.</li>
              <li :class="{ ok: pwChecks.lower }">Как минимум одна строчная буква (a–z)</li>
              <li :class="{ ok: pwChecks.complex }">Как минимум одна цифра, специальный символ или пробел.</li>
            </ul>
          </VCol>

          <VCol cols="12" class="d-flex gap-4">
            <template v-if="!pwdEdit">
              <VBtn color="primary" @click="pwdEdit = true">Изменить</VBtn>
            </template>
            <template v-if="pwdEdit">
              <VBtn type="submit" color="primary">Сохранить изменения</VBtn>
              <VBtn variant="tonal" color="secondary" @click="pwdEdit=false; resetPwdForm()">Отмена</VBtn>
            </template>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>

  <!-- Удалить аккаунт -->
  <VCard>
    <VCardText>
      <h3 class="text-h5 mb-4">Удалить аккаунт</h3>

      <VAlert type="warning" variant="tonal" class="mb-4">
        <div class="text-subtitle-1 font-weight-medium mb-1">Вы уверены, что хотите удалить свой аккаунт?</div>
        <div>После удаления восстановить его будет невозможно. Пожалуйста, убедитесь в своём решении.</div>
      </VAlert>

      <div class="d-flex align-center mb-4">
        <VCheckbox v-model="agreeDelete" density="comfortable" hide-details class="me-4" />
        <div class="text-body-1">Я подтверждаю деактивацию своего аккаунта.</div>
      </div>

      <VBtn
        color="error"
        variant="elevated"
        :disabled="!agreeDelete || deleting"
        :loading="deleting"
        @click="openDeleteConfirm"
      >
        Удалить Аккаунт
      </VBtn>
    </VCardText>
  </VCard>

  <!-- Модалка подтверждения -->
  <VDialog v-model="confirmDeleteDialog" max-width="460">
    <VCard>
      <VCardTitle class="text-h6">Подтверждение</VCardTitle>
      <VCardText>Вы действительно хотите удалить аккаунт? Это действие необратимо.</VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="confirmDeleteDialog = false">Отмена</VBtn>
        <VBtn color="error" :loading="deleting" @click="doDeleteAccount">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>

<style scoped>
.requirements {
  margin: 0.25rem 0 0;
  padding-left: 1.2rem;
}
.requirements li {
  margin: 0.4rem 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.requirements li.ok {
  color: rgba(var(--v-theme-primary));
}
/* Обычные сообщения (messages) — чёрные */
:deep(.v-messages__message) {
  color: #000; /* или var(--v-theme-on-surface) */
}
/* Когда инпут в ошибке — оставляем красный от темы */
:deep(.v-input--error .v-messages__message) {
  color: var(--v-theme-error);
}
</style>
