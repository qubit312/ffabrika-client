<script setup lang="ts">
import avatarFallback from '@images/avatars/avatar-1.png'
import { onMounted, reactive, ref } from 'vue'
import { getProfile, updateProfile } from '~/services/profile'
import { email as emailRule, formatRuPhone, match, minLen, required, ruPhoneRule, stripDigits } from '~/utils/validators'

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (text: string, color: 'success' | 'error' = 'success') => { snack.text = text; snack.color = color; snack.show = true }

const isEdit = ref(false)
const isSaving = ref(false)
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
  const isOkSize = file.size <= 800 * 1024
  if (!isImage || !isOkSize) return notify('Разрешены JPG, GIF или PNG. Максимальный размер 800 КБ', 'error')

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
  name:        localStorage.getItem('user_name')  || '',
  lastName:    localStorage.getItem('user_last_name') || '',
  email:       localStorage.getItem('user_email') || '',
  organization:localStorage.getItem('user_organization') || '',
  phone: (() => {
    const raw = localStorage.getItem('user_phone') || ''
    const digits = stripDigits(raw)
    return digits ? formatRuPhone(digits) : ''
  })(),
  address:     localStorage.getItem('user_address') || '',
})

const clonePlain = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const original = ref(clonePlain(form))

const optionalRuPhone = (v: any) => !v || ruPhoneRule(v) === true || 'Телефон в формате +7XXXXXXXXXX'
const rules = {
  name: [required],
  lastName: [],          
  email: [required, emailRule],
  organization: [],
  phone: [optionalRuPhone],
}

const changePassword = ref(false)
const pwd = reactive({ p1: '', p2: '' })
const pwdRules = {
  req:  [(v: any) => (changePassword.value ? required(v) : true)],
  min6: [(v: any) => (changePassword.value ? minLen(6)(v) : true)],
  same: [(v: any) => (changePassword.value ? match(() => pwd.p1, 'Пароли не совпадают')(v) : true)],
}

function onPhoneInput(val: string) {
  if (!val) { form.phone = ''; return }
  const digits = stripDigits(val)
  const norm = digits.startsWith('8') ? `7${digits.slice(1)}` : digits
  form.phone = formatRuPhone(norm)
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

      const fromLs = localStorage.getItem('user_avatar_url')
      avatarUrl.value = fromLs || defaultAvatar

      original.value = clonePlain(form)
      originalAvatar.value = avatarUrl.value
    }
  } catch {}
}
onMounted(loadProfile)

const startEdit = () => { original.value = clonePlain(form); originalAvatar.value = avatarUrl.value; isEdit.value = true }
const cancel = () => {
  Object.assign(form, original.value)
  avatarUrl.value = originalAvatar.value
  avatarBase64.value = null
  if (fileInput.value) fileInput.value.value = ''
  changePassword.value = false
  pwd.p1 = ''; pwd.p2 = ''
  isEdit.value = false
}

async function save() {
  const res = await formRef.value?.validate?.()
  if (res && res.valid === false) return notify('Проверьте правильность заполнения полей', 'error')

  isSaving.value = true
  try {
    const payload: any = {
      name: form.name,
      email: form.email,
      address: form.address || null,
      phone: form.phone ? stripDigits(form.phone) : null,
      change_password: !!changePassword.value,
    }
    if (changePassword.value) payload.password = pwd.p1
    if (avatarBase64.value) payload.avatar = avatarBase64.value

    payload.organization = form.organization || null
    payload.lastName = form.lastName || null

    const { data, error } = await updateProfile(payload)
    if (error.value || !data.value?.success) {
      throw new Error(data.value?.message || 'Не удалось сохранить изменения')
    }

    localStorage.setItem('user_name', form.name || '')
    localStorage.setItem('user_last_name', form.lastName || '')
    localStorage.setItem('user_email', form.email || '')
    localStorage.setItem('user_address', form.address || '')
    localStorage.setItem('user_phone', payload.phone || '')
    localStorage.setItem('user_organization', form.organization || '')

    if (data.value.data?.avatar) {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      localStorage.setItem('user_avatar_path', data.value.data.avatar)
      localStorage.setItem('user_avatar_url', `${base}/storage/${data.value.data.avatar}`)
      avatarUrl.value = `${base}/storage/${data.value.data.avatar}`
    }

    avatarBase64.value = null
    if (fileInput.value) fileInput.value.value = ''
    changePassword.value = false
    pwd.p1 = ''; pwd.p2 = ''
    original.value = clonePlain(form)
    originalAvatar.value = avatarUrl.value
    isEdit.value = false
    notify('Изменения сохранены')
  } catch (e: any) {
    notify(e?.message || 'Не удалось сохранить изменения', 'error')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
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
      <VForm ref="formRef" class="mt-3" @submit.prevent="save">
        <VRow>
          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Имя</label>
            <VTextField
              v-model="form.name"
              placeholder="Ваше имя"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.name"
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
            />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Организация</label>
            <VTextField
              v-model="form.organization"
              placeholder="ООО «Компания»"
              variant="outlined"
              :disabled="!isEdit"
              :rules="rules.organization"
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
            />
          </VCol>

          <VCol cols="12">
            <VSwitch
              v-model="changePassword"
              :disabled="!isEdit"
              color="primary"
              inset
              label="Сменить пароль"
              class="mt-2"
            />
          </VCol>

          <template v-if="changePassword">
            <VCol cols="12" md="6">
              <VTextField
                v-model="pwd.p1"
                label="Новый пароль"
                placeholder="············"
                :type="'password'"
                :disabled="!isEdit"
                :rules="[...pwdRules.req, ...pwdRules.min6]"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="pwd.p2"
                label="Повторите пароль"
                placeholder="············"
                :type="'password'"
                :disabled="!isEdit"
                :rules="pwdRules.same"
              />
            </VCol>
          </template>

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

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>
