<script setup lang="ts">
import { deleteClientUser, getUsersByClient, updateClientUser } from '@/services/clientUsers'
import type { UpdateClientUserDto } from '@/types/clientUser'
import avatarFallback from '@images/avatars/avatar-1.png'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  type RoleItem
} from '~/services/roles'
import {
  inviteUser,
  type SaveUserDto, type User,
  type UserInClient
} from '~/services/users'
import { email as emailRule, formatRuPhone, required, ruPhoneRule, stripDigits } from '~/utils/validators'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success' | 'error' = 'success') => { snack.text = t; snack.color = c; snack.show = true }

interface ClientUserRole {
  id: number;
  visible_name: string;
}

interface ClientUser {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  created_at: string;
  role: ClientUserRole | null;
}

const loading = ref(false)
const rows = ref<ClientUser[]>([])
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
const editedClientUserId = ref<number | null>(null)
const isInvite = computed(() => editedUserId.value === null)

const roles = ref<RoleItem[]>([
  { id: 3, name: 'admin', visible_name: 'Администратор' },
  { id: 4, name: 'manager', visible_name: 'Менеджер' },
  { id: 5, name: 'logistics', visible_name: 'Логист' },
  { id: 6, name: 'ff-admin', visible_name: 'Администратор фулфилмента' },
  { id: 7, name: 'ff-pack', visible_name: 'Упаковщик фулфилмента' },
  { id: 8, name: 'ff-viewer', visible_name: 'Просмотр фулфилмента' }
])

const form = reactive<SaveUserDto>({ name: '', email: '', phone: '', address: '', role_id: 0 })
const userRules = {
  name: [required],
  email: [required, emailRule],
  phone: [(v:any)=>!v || ruPhoneRule(v)===true || 'Телефон в формате +7XXXXXXXXXX'],
  role: [(v:any)=>Number(v)>0 || 'Выберите роль'],
}

function openCreateUser() {
  userDialogTitle.value = 'Пригласить пользователя'
  editedUserId.value = null
  Object.assign(form, { email: '', role_id: 4 })
  userDialog.value = true
}

function openEditUser(u: ClientUser) {
  userDialogTitle.value = 'Сменить роль'
  editedUserId.value = u.user_id
  editedClientUserId.value = u.id

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
    const payload: UserInClient = {
      email: form.email,
      role_id: Number(form.role_id),
    }
    
    if (editedUserId.value == null) {
      const { data, error } = await inviteUser(payload)
      if (error.value || !data.value?.mail_sent) throw new Error(data.value?.message || 'Не удалось пригласить')
      notify('Пользователь приглашен')
    } else if (editedClientUserId.value) {
      const dto: UpdateClientUserDto = {role_id:  payload.role_id}
      const { data, error } = await updateClientUser(editedClientUserId.value, dto)
      if (error.value || !data.value) throw new Error(data.value || 'Не удалось сохранить')
      const idx = rows.value.findIndex(r => r.id === editedClientUserId.value)
      if (idx > -1) {
          rows.value[idx].role = {
              id: data.value.role_id,
              visible_name: data.value.role?.visible_name || ''
          };
      }

      notify('Изменения сохранены')
      userDialog.value = false
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || 'Ошибка сохранения'
    notify(msg, 'error')
  } finally {
    savingUser.value = false
  }
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

const headers = [
  { title: 'Пользователь', key: 'name', sortable: false },
  { title: 'Доступ', key: 'role', sortable: false },
  { title: 'Дата и время', key: 'date', sortable: false },
  { title: 'Действия', key: 'actions', sortable: false},
]

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

    <VDataTableServer 
      :headers="headers"
      class="text-no-wrap"
      :items="pageRows"
      :items-length="pageRows.length"
      :loading="loading"
      :items-per-page="itemsPerPage"
    >
      <template #no-data>
        <div v-if="!loading && total === 0">
          <span class="text-center py-6 text-medium-emphasis">Ничего не найдено</span>
        </div>
      </template>

      <template #loading>
        <div class="text-center pa-6">
          <div class="d-flex justify-center pa-6"><VProgressCircular indeterminate /></div>
        </div>
      </template>

      <template #item.name="{ item }">
        <div class="d-flex align-center">
          <VAvatar size="36" class="me-3" variant="tonal" color="primary"><VImg :src="userAvatarUrl(item)" /></VAvatar>
          <div class="d-flex flex-column">
            <span class="font-weight-medium">{{ item.name }}</span>
            <small class="text-medium-emphasis">{{ item.email }}</small>
          </div>
        </div>
      </template>

      <template #item.role="{ item }">
        <div class="d-flex align-center">
          <VChip v-if="item.role?.visible_name" size="small" class="me-2" variant="tonal" color="primary">{{ item.role.visible_name }}</VChip>
          <span v-else class="text-medium-emphasis">—</span>
        </div>
      </template>

      <template #item.date="{ item }">
        <span class="text-medium-emphasis">{{ item.created_at ? new Date(item.created_at).toLocaleString() : '—' }}</span>
      </template>

      <template #item.actions="{ item }">
        <IconBtn @click="openEditUser(item)"><VIcon icon="tabler-edit" /></IconBtn>
        <IconBtn @click="askDelete(item)"><VIcon icon="tabler-trash" /></IconBtn>
      </template>

      <template #bottom>  
          <VCardText class="pt-2">
            <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
              <div class="d-flex align-center gap-2">
                <span>Записей на странице</span>
                <VSelect
                  v-model="itemsPerPage"
                  :items="[5, 10, 25, 50, 100]"
                  style="max-inline-size: 8rem;min-inline-size: 5rem;"
                />
              </div>

              <VPagination
                v-model="page"
                :total-visible="$vuetify.display.smAndDown ? 3 : 5"
                :length="Math.ceil(pageRows.length / itemsPerPage)"
              />
            </div>
          </VCardText>
        </template>
    </VDataTableServer>
  </VCard>
  <!-- Диалоговое окно -->
  <VDialog v-model="userDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ isInvite ? 'Пригласить пользователя' : 'Сменить роль' }}
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VForm ref="formRef" @submit.prevent="saveUser">
          <VRow>
            <VCol cols="12" md="12">
              <VTextField
                :append-inner-icon="!isInvite ? 'tabler-lock' : undefined"
                :readonly="!isInvite"
                v-model="form.email"
                type="email"
                label="Email"
                :rules="userRules.email"
              />
            </VCol>
            <VCol cols="12">
              <VSelect
                v-model="form.role_id"
                :items="roles"
                item-title="visible_name"
                item-value="id"
                label="Роль"
                :rules="userRules.role"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="userDialog = false">{{ isInvite ? 'Закрыть' : 'Отмена' }}</VBtn>
        <VBtn variant="outlined" color="primary" :loading="savingUser" @click="saveUser">
          {{ isInvite ? 'Отправить приглашение' : 'Сохранить' }}
        </VBtn>
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
