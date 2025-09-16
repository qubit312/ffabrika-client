<script setup lang="ts">
import { deleteClientUser, getUsersByClient } from '@/services/clientUsers'
import avatarFallback from '@images/avatars/avatar-1.png'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  type RoleItem
} from '~/services/roles'
import {
  inviteUser,
  updateUser,
  type SaveUserDto, type User
} from '~/services/users'
import { email as emailRule, formatRuPhone, required, ruPhoneRule, stripDigits } from '~/utils/validators'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success' | 'error' = 'success') => { snack.text = t; snack.color = c; snack.show = true }

const loading = ref(false)
const rows = ref<User[]>([])
const search = ref('')
const itemsPerPage = ref(10)
const page = ref(1)
watch([itemsPerPage, search], () => { page.value = 1 })

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(u =>
    u.name?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.role?.visible_name?.toLowerCase().includes(q),
  )
})
const total = computed(() => filtered.value.length)
const pageRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filtered.value.slice(start, start + itemsPerPage.value)
})
function userAvatarUrl(u: User) {
  return u?.avatar ? `${API_BASE}/storage/${u.avatar}` : avatarFallback
}
async function fetchUsers() {
  loading.value = true
  try {
    const { data, error } = await getUsersByClient()
    if (error.value) throw error.value
    rows.value = data.value || []
  } catch (e: any) {
    notify(e?.message || 'Не удалось загрузить пользователей', 'error')
  } finally { loading.value = false }
}

const userDialog = ref(false)
const userDialogTitle = ref('Новый пользователь')
const formRef = ref<any>(null)
const savingUser = ref(false)
const editedUserId = ref<number | null>(null)

// const roles = ref<RoleItem[]>([])
const roles = ref<RoleItem[]>([
  { id: 3, name: 'admin', visible_name: 'Администратор' },
  { id: 4, name: 'manager', visible_name: 'Менеджер' },
  { id: 5, name: 'logistics', visible_name: 'Логист' }
])

const form = reactive<SaveUserDto>({ name: '', email: '', phone: '', address: '', role_id: 0 })
const userRules = {
  name: [required],
  email: [required, emailRule],
  phone: [(v:any)=>!v || ruPhoneRule(v)===true || 'Телефон в формате +7XXXXXXXXXX'],
  role: [(v:any)=>Number(v)>0 || 'Выберите роль'],
}
function onPhoneInput(v: string) {
  if (!v) { form.phone = ''; return }
  const d = stripDigits(v)
  const norm = d.startsWith('8') ? `7${d.slice(1)}` : d
  form.phone = formatRuPhone(norm)
}

function openCreateUser() {
  userDialogTitle.value = 'Пригласить пользователя'
  editedUserId.value = null
  Object.assign(form, { name: '', email: '', phone: '', address: '', role_id: 5})
  userDialog.value = true
}

function openEditUser(u: User) {
  userDialogTitle.value = 'Редактировать пользователя'
  editedUserId.value = u.id
  Object.assign(form, {
    name: u.name || '',
    email: u.email || '',
    phone: u.phone ? formatRuPhone(stripDigits(u.phone)) : '',
    address: u.address || '',
    role_id: u.role?.id || 0,
  })
  userDialog.value = true
}
async function saveUser() {
  const res = await formRef.value?.validate?.()
  if (res && res.valid === false) return
  savingUser.value = true
  try {
    const payload: SaveUserDto = {
      name: form.name,
      email: form.email,
      phone: form.phone ? stripDigits(form.phone) : null,
      address: form.address || null,
      role_id: Number(form.role_id),
    }
    if (editedUserId.value == null) {
      const { data, error } = await inviteUser(payload)
      if (error.value || !data.value?.mail_sent) throw new Error(data.value?.message || 'Не удалось пригласить')
      // rows.value.unshift(data.value.data)
      notify('Пользователь приглашен')
    } else {
      const { data, error } = await updateUser(editedUserId.value, payload)
      if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось сохранить')
      const idx = rows.value.findIndex(r => r.id === editedUserId.value)
      if (idx > -1) rows.value[idx] = data.value.data
      notify('Изменения сохранены')
    }
    userDialog.value = false
  } catch (e:any) {
    notify(e?.message || 'Ошибка сохранения', 'error')
  } finally { savingUser.value = false }
}

const deleteDialog = ref(false)
const deletingId = ref<number | null>(null)
const deleteTarget = ref<User | null>(null)
function askDelete(u: User) { deleteTarget.value = u; deleteDialog.value = true }

async function confirmDelete() {
  if (!deleteTarget.value) return
  deletingId.value = deleteTarget.value.id
  try {
    const { data, error } = await deleteClientUser(deleteTarget.value.id)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось удалить')
    rows.value = rows.value.filter(r => r.id !== deleteTarget.value!.id)
    notify('Пользователь удалён')
  } catch (e:any) {
    notify(e?.message || 'Ошибка удаления', 'error')
  } finally {
    deletingId.value = null; deleteDialog.value = false; deleteTarget.value = null
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers()])
})
</script>

<template>
  <!-- Пользователи -->
  <VCard>
    <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
      <!-- <div class="d-flex align-center gap-3">
        <span class="text-body-2">Show</span>
        <VSelect v-model="itemsPerPage" :items="[10,25,50,100]" hide-details density="comfortable" style="inline-size:84px" />
      </div> -->

      <div class="d-flex align-center gap-3 ms-auto">
        <!-- <VTextField v-model="search" placeholder="Search Permissions" hide-details density="comfortable" style="inline-size:320px" prepend-inner-icon="tabler-search" /> -->
        <VBtn color="primary" prepend-icon="tabler-user-plus" @click="openCreateUser">Пригласить пользователя</VBtn>
      </div>
    </VCardText>

    <VDivider />

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th class="text-subtitle-2">ПОЛЬЗОВАТЕЛЬ</th>
          <th class="text-subtitle-2">ДОСТУП</th>
          <th class="text-subtitle-2">ДАТА И ВРЕМЯ</th>
          <th class="text-subtitle-2 text-right">ДЕЙСТВИЯ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="7">
            <div class="d-flex justify-center pa-6"><VProgressCircular indeterminate /></div>
          </td>
        </tr>

        <tr v-for="u in pageRows" :key="u.id">
          <td>
            <div class="d-flex align-center">
              <VAvatar size="36" class="me-3" variant="tonal" color="primary"><VImg :src="userAvatarUrl(u)" /></VAvatar>
              <div class="d-flex flex-column">
                <span class="font-weight-medium">{{ u.name }}</span>
                <small class="text-medium-emphasis">{{ u.email }}</small>
              </div>
            </div>
          </td>
          <td>
            <VChip v-if="u.role?.visible_name" size="small" class="me-2" variant="tonal" color="primary">{{ u.role.visible_name }}</VChip>
            <span v-else class="text-medium-emphasis">—</span>
          </td>
          <td><span class="text-medium-emphasis">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '—' }}</span></td>
          <td class="text-right">
            <IconBtn @click="openEditUser(u)"><VIcon icon="tabler-edit" /></IconBtn>
            <IconBtn @click="askDelete(u)"><VIcon icon="tabler-trash" /></IconBtn>
          </td>
        </tr>

        <tr v-if="!loading && total === 0">
          <td colspan="7" class="text-center py-6 text-medium-emphasis">Ничего не найдено</td>
        </tr>
      </tbody>
    </VTable>

    <VDivider />
    <div class="d-flex align-center justify-space-between pa-4">
      <div class="text-body-2 text-medium-emphasis">
        Показано с {{ Math.min((page-1)*itemsPerPage+1, total) }} по {{ Math.min(page*itemsPerPage, total) }} из {{ total }}
      </div>
      <VPagination v-model="page" :length="Math.max(Math.ceil(total / itemsPerPage), 1)" density="comfortable" rounded="lg" show-first-last-page />
    </div>
  </VCard>

  <!-- Диалоговое окно -->
  <VDialog v-model="userDialog" max-width="560">
    <VCard>
      <VCardTitle class="text-h6">{{ userDialogTitle }}</VCardTitle>
      <VDivider />
      <VCardText>
        <VForm ref="formRef" @submit.prevent="saveUser">
          <VRow>
            <VCol cols="12"><VTextField v-model="form.email" type="email" label="Email" :rules="userRules.email" /></VCol>

            <VCol cols="12">
              <VSelect v-model="form.role_id" :items="roles" item-title="visible_name" item-value="id" label="Роль" :rules="userRules.role" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="userDialog=false">Отмена</VBtn>
        <VBtn color="primary" :loading="savingUser" @click="saveUser">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Пользователь -->
  <VDialog v-model="deleteDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">Удалить пользователя?</VCardTitle>
      <VCardText>
        Вы действительно хотите исключить пользователя 
        <strong v-if="deleteTarget">{{ deleteTarget.name }}</strong>
        из организации?
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="deleteDialog=false">Отмена</VBtn>
        <VBtn color="error" :loading="!!deletingId" @click="confirmDelete">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>
