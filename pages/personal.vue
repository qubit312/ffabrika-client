<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, getProfile, sendVerificationEmail, updateProfile } from '~/services/profile'
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
const copiedField = ref<string | null>(null)

const emailVerified = ref(true)
const emailVerifiedDialog = ref(false)
const emailVerifiedLoading = ref(false)

const form = reactive({
  name: localStorage.getItem('user_name') || '',
  lastName: localStorage.getItem('user_last_name') || '',
  email: localStorage.getItem('user_email') || '',
  phone: (() => {
    const raw = localStorage.getItem('user_phone') || ''
    const d = stripDigits(raw)
    return d ? formatRuPhone(d) : ''
  })(),
  address: localStorage.getItem('user_address') || '',
  telegram: localStorage.getItem('user_telegram') || '',
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
      form.lastName = u.last_name || ''   // подтягиваем фамилию из API
      form.email = u.email || ''
      form.address = u.address || ''
      form.phone = u.phone ? formatRuPhone(stripDigits(u.phone)) : ''
      form.telegram = u.telegram || ''
      emailVerified.value = u.email_verified
    }
  } catch { /* ignore */ }
}
onMounted(loadProfile)

const startEdit = () => { isEdit.value = true }
const cancel = () => {
  loadProfile()
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
      last_name: form.lastName || null, // сохраняем фамилию
      email: form.email,
      address: form.address || null,
      phone: form.phone ? stripDigits(form.phone) : null,
      telegram: form.telegram || null,
      change_password: false,
    }

    const { data, error } = await updateProfile(payload)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось сохранить')

    localStorage.setItem('user_name', form.name || '')
    localStorage.setItem('user_last_name', form.lastName || '')
    localStorage.setItem('user_email', form.email || '')
    localStorage.setItem('user_address', form.address || '')
    localStorage.setItem('user_phone', payload.phone || '')
    localStorage.setItem('user_telegram', form.telegram || '')

    if (data.value?.data) {
      emailVerified.value = data.value.data.email_verified
    } else {
      emailVerified.value = true
    }

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
  const id = userId.value
  if (id) {
    return
  }

  try {
    notify('Запрос на удаление аккаунта отправлен администратору')
    confirmDeleteDialog.value = false
    agreeDelete.value = false
  } catch (e: any) {
    notify(e?.message || 'Не удалось удалить аккаунт', 'error')
  } finally {
    deleting.value = false
  }
}

async function onSendVerificationEmail() {
  emailVerifiedLoading.value = true
  const { data, error } = await sendVerificationEmail()
  emailVerifiedLoading.value = false
  emailVerifiedDialog.value = true
}

const copyToClipboard = (text: string, field: string) => {
  if (text) {
    navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = null }, 2000)
  }
}
</script>

<template>
  <VCard elevation="2" class="mb-4" :loading="isSaving">
    <VCardTitle class="text-h6 pa-4">Профиль</VCardTitle>
    <VDivider />
    <VCardText class="pt-2">
      <div class="d-flex align-center mb-4">
        <UserAvatar
          :name="form.name"
          :last-name="form.lastName"
          size="100"
          rounded
          :font-size="40"           
          class="me-6"
        />

      </div>

      <VRow v-if="!emailVerified">
        <VCol cols="12" md="6">
          <VAlert type="warning" variant="tonal" density="compact">
            <div class="alert-content">
              <span>Почта {{ form.email }} не подтверждена</span>
              <VBtn class="ms-4" color="primary" size="small" :disabled="emailVerifiedLoading" @click="onSendVerificationEmail">
                <template #prepend>
                  <VProgressCircular v-if="emailVerifiedLoading" indeterminate size="16" width="2" class="me-2" />
                </template>
                Подтвердить
              </VBtn>
            </div>
          </VAlert>
        </VCol>
      </VRow>

      <VForm ref="formRef" class="mt-3" :validate-on="submitted ? 'input' : 'blur'" @submit.prevent="saveProfile">
        <VRow v-if="!isEdit" class="view-mode">
          <!-- Режим просмотра -->
          <VCol cols="12" md="6">
            <VList density="default">
              <VListItem @click="copyToClipboard(form.name, 'name')">
                <VListItemTitle>Имя</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'name'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'name'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ form.name || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'name' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(form.lastName, 'lastName')">
                <VListItemTitle>Фамилия</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'lastName'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'lastName'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ form.lastName || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'lastName' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(form.email, 'email')">
                <VListItemTitle>
                  E-mail
                  <VTooltip :text="emailVerified ? 'Почта подтверждена' : 'Почта не подтверждена'" class="ml-4">
                    <template #activator="{ props }">
                      <VIcon v-bind="props" :icon="emailVerified ? 'tabler-circle-check' : 'tabler-circle-x'" :color="emailVerified ? 'success' : 'warning'" size="24" />
                    </template>
                  </VTooltip>
                </VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'email'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'email'">
                    <template #activator="{ props }">
                      <span v-bind="props" class="d-flex align-center">
                        {{ form.email || 'Не указано' }}
                      </span>
                    </template>
                    {{ copiedField === 'email' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
            </VList>
          </VCol>
          <VCol cols="12" md="6">
            <VList density="default">
              <VListItem @click="copyToClipboard(form.telegram, 'telegram')">
                <VListItemTitle>Telegram</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'telegram'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'telegram'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ form.telegram || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'telegram' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(form.phone, 'phone')">
                <VListItemTitle>Телефон</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'phone'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'phone'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ form.phone || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'phone' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(form.address, 'address')">
                <VListItemTitle>Адрес</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'address'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'address'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ form.address || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'address' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
            </VList>
          </VCol>
          <VCol cols="12" class="d-flex flex-wrap gap-4">
            <VBtn color="primary" @click="startEdit" class="text-capitalize" elevation="2">
              Редактировать
            </VBtn>
          </VCol>
        </VRow>

        <!-- Режим редактирования -->
        <VRow v-else v-slide-y-transition>
          <VCol cols="12" md="6">
            <VTextField
              v-model="form.name"
              label="Имя"
              placeholder="Ваше имя"
              variant="outlined"
              class="mb-4"
              :rules="rules.name"
              v-bind="fieldState(rules.name, form.name, submitted)"
              :error="fieldState(rules.name, form.name, submitted).hasError"
            />
            <VTextField
              v-model="form.lastName"
              label="Фамилия"
              placeholder="Ваша фамилия"
              variant="outlined"
              class="mb-4"
              :rules="rules.lastName"
              v-bind="fieldState(rules.lastName, form.lastName, submitted)"
              :error="fieldState(rules.lastName, form.lastName, submitted).hasError"
            />
            <VTextField
              v-model="form.email"
              label="E-mail"
              type="email"
              placeholder="you@example.com"
              variant="outlined"
              class="mb-4"
              :rules="rules.email"
              v-bind="fieldState(rules.email, form.email, submitted)"
              :error="fieldState(rules.email, form.email, submitted).hasError"
              :append-inner-icon="emailVerified ? 'tabler-circle-check' : 'tabler-circle-x'"
              :append-inner-icon-color="emailVerified ? 'success' : 'warning'"
              @click:append-inner="!emailVerified && onSendVerificationEmail()"
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              :model-value="form.telegram"
              label="Telegram"
              placeholder="@username"
              variant="outlined"
              class="mb-4"
              :rules="rules.telegram"
              v-bind="fieldState(rules.telegram, form.telegram, submitted)"
              :error="fieldState(rules.telegram, form.telegram, submitted).hasError"
              @update:model-value="onTelegramInput"
            />
            <VTextField
              :model-value="form.phone"
              label="Телефон"
              placeholder="+7 (___) ___-__-__"
              variant="outlined"
              class="mb-4"
              :rules="rules.phone"
              inputmode="tel"
              maxlength="18"
              v-bind="fieldState(rules.phone, form.phone, submitted)"
              :error="fieldState(rules.phone, form.phone, submitted).hasError"
              @update:model-value="onPhoneInput"
            />
            <VTextField
              v-model="form.address"
              label="Адрес"
              placeholder="Город, улица, дом"
              variant="outlined"
              class="mb-4"
              :rules="rules.address"
              v-bind="fieldState(rules.address, form.address, submitted)"
              :error="fieldState(rules.address, form.address, submitted).hasError"
            />
          </VCol>
          <VCol cols="12" class="d-flex flex-wrap gap-4">
            <VBtn type="submit" color="primary" :loading="isSaving" class="text-capitalize" elevation="2">
              Сохранить изменения
            </VBtn>
            <VBtn variant="tonal" color="secondary" @click="cancel" class="text-capitalize" elevation="2">
              Отмена
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>

  <!-- Смена пароля -->
  <VCard elevation="2" class="mb-4">
    <VCardTitle class="text-h6 pa-4">Изменить пароль</VCardTitle>
    <VDivider />
    <VCardText>
      <VForm ref="pwdFormRef" @submit.prevent="savePassword">
        <VRow>
          <VCol cols="12" md="6">
            <VTextField
              v-model="pwd.current"
              label="Текущий пароль"
              :type="show.current ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              class="mb-4"
              :append-inner-icon="show.current ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.current = !show.current"
            />
            <VTextField
              v-model="pwd.p1"
              label="Новый пароль"
              :type="show.p1 ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              class="mb-4"
              :rules="pwdEdit ? pwdRules.new : []"
              :append-inner-icon="show.p1 ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.p1 = !show.p1"
            />
            <VTextField
              v-model="pwd.p2"
              label="Подтвердите новый пароль"
              :type="show.p2 ? 'text' : 'password'"
              placeholder="……………"
              :disabled="!pwdEdit"
              class="mb-4"
              :rules="pwdEdit ? pwdRules.confirm : []"
              :append-inner-icon="show.p2 ? 'tabler-eye-off' : 'tabler-eye'"
              @click:append-inner="show.p2 = !show.p2"
            />
          </VCol>
          <VCol cols="12" md="6">
            <div class="text-body-1 mb-2">Требования к паролю:</div>
            <ul class="requirements">
              <li :class="{ ok: pwChecks.len }">Минимум 8 символов — чем больше, тем лучше.</li>
              <li :class="{ ok: pwChecks.lower }">Как минимум одна строчная буква (a–z)</li>
              <li :class="{ ok: pwChecks.complex }">Как минимум одна цифра, специальный символ или пробел.</li>
            </ul>
          </VCol>
          <VCol cols="12" class="d-flex gap-4">
            <template v-if="!pwdEdit">
              <VBtn color="primary" @click="pwdEdit = true" class="text-capitalize" elevation="2">Изменить</VBtn>
            </template>
            <template v-if="pwdEdit">
              <VBtn type="submit" color="primary" class="text-capitalize" elevation="2">Сохранить изменения</VBtn>
              <VBtn variant="tonal" color="secondary" @click="pwdEdit=false; resetPwdForm()" class="text-capitalize" elevation="2">Отмена</VBtn>
            </template>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>

  <!-- Удалить аккаунт -->
  <VCard elevation="2" class="mb-4">
    <VCardTitle class="text-h6 pa-4">Удалить аккаунт</VCardTitle>
    <VDivider />
    <VCardText>
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
        class="text-capitalize"
        elevation="2"
      >
        Удалить Аккаунт
      </VBtn>
    </VCardText>
  </VCard>

  <!-- Модалка для подтверждения удаления -->
  <VDialog v-model="confirmDeleteDialog" max-width="460">
    <VCard>
      <VCardTitle class="text-h6">Подтверждение</VCardTitle>
      <VCardText>Вы действительно хотите удалить аккаунт? Это действие необратимо.</VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="tonal" color="secondary" @click="confirmDeleteDialog = false" class="text-capitalize">Отмена</VBtn>
        <VBtn color="error" :loading="deleting" @click="doDeleteAccount" class="text-capitalize">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Модалка о запросе подтверждения почты -->
  <VDialog v-model="emailVerifiedDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">Подтверждение почты</VCardTitle>
      <VDivider />
      <VCardText>Письмо с подтверждением отправлено на адрес <b>{{ form.email }}</b>.</VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="emailVerifiedDialog = false" class="text-capitalize">Готово</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>

<style scoped>
.view-mode .v-list-item {
  transition: background-color 0.2s ease;
  border-radius: 4px;
  margin-bottom: 8px;
}
:deep(.v-messages__message) {
  color: #000;
}
:deep(.v-input--error .v-messages__message) {
  color: var(--v-theme-error);
}
.v-card {
  border-radius: 8px;
}
.v-btn {
  border-radius: 6px;
  transition: transform 0.2s ease;
}
.v-btn:hover {
  transform: translateY(-2px);
}
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
.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>
