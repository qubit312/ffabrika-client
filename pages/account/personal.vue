<script setup lang="ts">
import avatar1 from '@images/avatars/avatar-1.png'
import { toRaw } from 'vue'

const isSaving = ref(false)
const isEdit = ref(false)

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (text: string, color: 'success' | 'error' = 'success') => {
  snack.text = text
  snack.color = color
  snack.show = true
}

const defaultAvatar = avatar1 as string
const avatarUrl = ref<string>(defaultAvatar)
const originalAvatar = ref<string>(defaultAvatar)
const fileInput = ref<HTMLInputElement | null>(null)

const pickFile = () => fileInput.value?.click()
const onFile = (e: Event) => {
  if (!isEdit.value) return
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const isImage = /image\/(png|jpeg|jpg|gif)/i.test(file.type)
  const isOkSize = file.size <= 800 * 1024
  if (!isImage || !isOkSize) {
    notify('Разрешены JPG, GIF или PNG. Максимальный размер 800 КБ', 'error')
    return
  }
  avatarUrl.value = URL.createObjectURL(file)

}
const resetAvatar = () => {
  if (!isEdit.value) return
  avatarUrl.value = originalAvatar.value
  if (fileInput.value) fileInput.value.value = ''
}

const form = reactive({
  firstName: 'Иван',
  lastName: 'Иванов',
  email: 'ivan@example.com',
  organization: 'ООО «Компания»',
  phone: '+7 (900) 000-00-00',
  address: 'Москва, ул. Пушкина, д. 1',
  state: 'Москва',
  zip: '101000',
  country: 'Россия',
  language: 'Русский',
  timezone: '(GMT+03:00) Москва',
  currency: 'RUB',
})

const clonePlain = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const original = ref(clonePlain(toRaw(form)))

const countries = ['Россия', 'США', 'Германия', 'Франция', 'Турция', 'Казахстан', 'Узбекистан']
const languages = ['Русский', 'English', 'Deutsch', 'Türkçe']
const timezones = ['(GMT+03:00) Москва', '(GMT+05:00) Ташкент', '(GMT+08:00) Сингапур', '(GMT+00:00) UTC']
const currencies = ['RUB', 'USD', 'EUR', 'KZT', 'UZS', 'TRY']

const startEdit = () => {
  original.value = clonePlain(toRaw(form))
  originalAvatar.value = avatarUrl.value
  isEdit.value = true
}

const cancel = () => {
  Object.assign(form, original.value)
  avatarUrl.value = originalAvatar.value
  if (fileInput.value) fileInput.value.value = ''
  isEdit.value = false
}

const save = async () => {
  isSaving.value = true
  try {
    await new Promise(r => setTimeout(r, 400))
    notify('Изменения сохранены')
    isEdit.value = false
  } catch {
    notify('Не удалось сохранить изменения', 'error')
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
      <VForm class="mt-3" @submit.prevent="save">
        <VRow>
          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Имя</label>
            <VTextField v-model="form.firstName" placeholder="Иван" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Фамилия</label>
            <VTextField v-model="form.lastName" placeholder="Иванов" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">E-mail</label>
            <VTextField v-model="form.email" type="email" placeholder="you@example.com" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Организация</label>
            <VTextField v-model="form.organization" placeholder="Компания" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Телефон</label>
            <VTextField v-model="form.phone" placeholder="+7 (900) 000-00-00" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Адрес</label>
            <VTextField v-model="form.address" placeholder="Город, улица, дом" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Регион</label>
            <VTextField v-model="form.state" placeholder="Москва" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Почтовый индекс</label>
            <VTextField v-model="form.zip" placeholder="101000" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Страна</label>
            <VSelect v-model="form.country" :items="countries" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Язык интерфейса</label>
            <VSelect v-model="form.language" :items="languages" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Часовой пояс</label>
            <VSelect v-model="form.timezone" :items="timezones" variant="outlined" :disabled="!isEdit" />
          </VCol>

          <VCol cols="12" md="6">
            <label class="v-label mb-1 text-body-2">Валюта</label>
            <VSelect v-model="form.currency" :items="currencies" variant="outlined" :disabled="!isEdit" />
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

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>
