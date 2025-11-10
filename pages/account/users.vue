<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue'
import { getFullfilments } from '@/services/clients'
import { addFulfillmentToOrg, deleteClientUser, getInvitationsByClient, getUsersByClient, updateClientUser } from '@/services/clientUsers'
import type { UpdateClientUserDto } from '@/types/clientUser'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { type RoleItem } from '~/services/roles'
import { inviteUser, revokeInvite, type SaveUserDto, type UserInClient } from '~/services/users'
import { email as emailRule, formatRuPhone, required, ruPhoneRule, stripDigits } from '~/utils/validators'

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success' | 'error' = 'success') => { snack.text = t; snack.color = c; snack.show = true }

interface ClientUserRole {
  id: number;
  visible_name: string;
}

interface FulfillmentOrganization {
  id: number | null;
  name: string;
}

interface ClientUserStatus {
  name: string;
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
  type: string;
  role: ClientUserRole | null;
  status: ClientUserStatus | null;
}

const { roleVisibleName, userId: currentUserId } = useCurrentUser()
const isOrgAdmin = computed(() => roleVisibleName.value === 'Администратор')

const loadingUsers = ref(false)
const loadingInvitations = ref(false)
const loadingFullfilments = ref(false)

const rows = ref<ClientUser[]>([])
const fullfilments = ref<FulfillmentOrganization[]>([])
const invitations = ref<ClientUser[]>([])

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
async function fetchUsers() {
  loadingUsers.value = true
  try {
    const { data, error } = await getUsersByClient()
    if (error.value) throw error.value
    rows.value = data.value || []
  } catch (e: any) {
    notify(e?.message || 'Не удалось загрузить пользователей', 'error')
  } finally { loadingUsers.value = false }
}

async function fetchFfOrg() {
  loadingFullfilments.value = true
  try {
    const { data, error } = await getFullfilments(false)
    if (error.value) throw error.value
    const result = data.value.data
    fullfilments.value = result || []
  } catch (e: any) {
    notify(e?.message || 'Не удалось загрузить фулфилмент', 'error')
  } finally {
    loadingFullfilments.value = false
  }
}

async function fetchInvitations() {
  if(!isOrgAdmin.value) return
  loadingInvitations.value = true
  try {
    const { data, error } = await getInvitationsByClient()
    if (error.value) throw error.value
    invitations.value = data.value || []
  } catch (e: any) {
    notify(e?.message || 'Не удалось загрузить приглашения', 'error')
  } finally { loadingInvitations.value = false }
}

const fulfillmentDialog = ref(false)
const fulfillmentDialogTitle = ref('Новый пользователь')
const userDialog = ref(false)
const userDialogTitle = ref('Новый пользователь')
const formRef = ref<any>(null)
const savingUser = ref(false)
const invatingFf = ref(false)
const editedUserId = ref<number | null>(null)
const editedClientUserId = ref<number | null>(null)
const isInvite = computed(() => editedUserId.value === null)

const roles = ref<RoleItem[]>([
  { id: 1, name: 'admin', visible_name: 'Администратор' },
  { id: 2, name: 'manager', visible_name: 'Менеджер' },
  { id: 3, name: 'logistics', visible_name: 'Логист' },
])

const form = reactive<SaveUserDto>({ name: '', email: '', phone: '', address: '', role_id: 0 })
const formInviteFf = reactive<FulfillmentOrganization>({ id: null, name: '' })

const userRules = {
  name: [required],
  email: [required, emailRule],
  phone: [(v:any)=>!v || ruPhoneRule(v)===true || 'Телефон в формате +7XXXXXXXXXX'],
  role: [(v:any)=>Number(v)>0 || 'Выберите роль'],
}

function openCreateUser() {
  userDialogTitle.value = 'Пригласить пользователя'
  editedUserId.value = null
  Object.assign(form, { email: '', role_id: 3 })
  userDialog.value = true
}

function openInviteFulfillment() {
  fetchFfOrg()
  formInviteFf.id = null
  formInviteFf.name = ''
  fulfillmentDialogTitle.value = 'Пригласить фулфилмент'
  fulfillmentDialog.value = true
}

function showEditButton(u: ClientUser) {
  if (!u || !u.role?.id) return false
  if (u.role.id === 4) return false
  return true
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

async function sendFfInvitation() {
  const fulfillmentId = formInviteFf.id
  if (!fulfillmentId) return

  const payload = { fulfillment_id: fulfillmentId }

  try {
    const { data, error } = await addFulfillmentToOrg(payload)
    if (error.value || !data.value?.data) throw new Error(data.value?.message || 'Не удалось добавить')
    notify('Фулфилмент добавлен')
  } catch (e:any) {
    notify(e?.message || 'Ошибка при добавлении фулфилмента', 'error')
  } finally {
    fetchUsers()
  }

  fulfillmentDialog.value = false
}

async function saveUser() {
  editUserRoleDialog.value = false
  if(!isOrgAdmin.value) return

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
      editUserRoleDialog.value = false
      fetchInvitations()
    } else if (editedClientUserId.value) {
      const dto: UpdateClientUserDto = { role_id:  payload.role_id }
      const { data, error } = await updateClientUser(editedClientUserId.value, dto)
      if (error.value || !data.value) throw new Error(data.value || 'Не удалось сохранить')
      const idx = rows.value.findIndex(r => r.id === editedClientUserId.value)
      if (idx > -1) {
        const role = data.value?.user?.role
        rows.value[idx].role = {
          id: role.id,
          visible_name: role?.visible_name || ''
        }
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

function openEditUserRoleDialog(val: SaveUserDto) {
  editDialogForm.userName = val.name
  const role = roles.value.find(r => r.id === val.role_id)
  editDialogForm.roleVisibleName = role ? role.visible_name : ''
  editUserRoleDialog.value = true
}

const deleteDialog = ref(false)
const editUserRoleDialog = ref(false)
const deletingId = ref<number | null>(null)
const deleteTarget = ref<ClientUser | null>(null)
const editDialogForm = reactive({ userName: '', roleVisibleName: '' })
function askDelete(u: ClientUser) { deleteTarget.value = u; deleteDialog.value = true }

async function confirmDelete() {
  if(!isOrgAdmin.value) return
  if (!deleteTarget.value) return

  deletingId.value = deleteTarget.value.id
  try {
    const { data, error } = await deleteClientUser(deleteTarget.value.id)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось удалить')
    rows.value = rows.value.filter(r => r.id !== deleteTarget.value!.id)
    notify('Участник удалён')
  } catch (e:any) {
    notify(e?.message || 'Ошибка удаления', 'error')
  } finally {
    deletingId.value = null; deleteDialog.value = false; deleteTarget.value = null
  }
}

function getStatusColor(status: ClientUserStatus) {
  const statusValue = status.name
  switch (statusValue.toLowerCase()) {
    case 'invited':
      return 'info'
    case 'accepted':
      return 'success'
    case 'expired':
      return 'warning'
    case 'revoked':
      return 'error'
    default:
      return 'primary'
  }
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchInvitations()])
})

async function cancelInvitation() {
  if (!deleteTarget.value) return
  deletingId.value = deleteTarget.value.id
  try {
    const { data, error } = await revokeInvite(deleteTarget.value.id)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось отменить')
    rows.value = rows.value.filter(r => r.id !== deleteTarget.value!.id)
    notify('Приглашение отменено')
  } catch (e:any) {
    notify(e?.message || 'Ошибка при отмене', 'error')
  } finally {
    deletingId.value = null; deleteDialog.value = false; deleteTarget.value = null
    fetchInvitations()
  }
}

const usersHeaders = computed(() => {
  const base = [
    { title: 'Название', key: 'name', sortable: false },
    { title: 'Доступ', key: 'role', sortable: false },
    { title: 'Дата и время', key: 'date', sortable: false },
  ]
  if (isOrgAdmin.value) {
    base.push({ title: 'Действия', key: 'actions', sortable: false })
  }
  return base
})

const invitationHeaders = [
  { title: 'Почта', key: 'name', sortable: false },
  { title: 'Доступ', key: 'role', sortable: false },
  { title: 'Дата и время', key: 'date', sortable: false },
  { title: 'Статус', key: 'status', sortable: false },
  { title: 'Действия', key: 'actions', sortable: false},
]

const isCurrent = (u: { user_id?: number }) =>
  currentUserId?.value != null && u.user_id === currentUserId.value
</script>

<template>
  <!-- Пользователи -->
  <VCard>
    <VCardTitle class="mt-2 d-flex align-center justify-space-between">
      <span class="text-h6">Участники</span>
      <div class="d-flex align-center gap-3 ms-auto">
        <VBtn v-if="isOrgAdmin" color="primary" prepend-icon="tabler-user-plus" @click="openCreateUser">Пригласить пользователя</VBtn>
        <VBtn v-if="isOrgAdmin" color="primary" prepend-icon="tabler-briefcase" @click="openInviteFulfillment">Пригласить фулфилмент</VBtn>
      </div>
    </VCardTitle>

    <VDivider class="mt-2 mb-4" />

    <VDataTableServer
      :headers="usersHeaders"
      class="text-no-wrap"
      :items="pageRows"
      :items-length="pageRows.length"
      :loading="loadingUsers"
      :items-per-page="itemsPerPage"
    >
      <template #no-data>
        <div v-if="!loadingUsers && total === 0">
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
          <template v-if="item.role?.id === 4">
            <VIcon class="me-3" icon="tabler-briefcase" size="36" />
          </template>

          <template v-else>
            <UserAvatar
              :name="item.name || item.email"
              :last-name="''"
              size="36"
              rounded="circle"
              :font-size="16"
              class="me-3"
            />
          </template>

          <div class="d-flex flex-column">
            <span class="font-weight-medium d-flex align-center">
              {{ item.name || item.email }}
              <VChip
                v-if="isCurrent(item)"
                size="x-small"
                color="success"
                variant="flat"
                class="ms-2"
              >
                Это вы
              </VChip>
            </span>
            <small v-if="item.type !== 'invitation'" class="text-medium-emphasis">{{ item.email }}</small>
          </div>
        </div>
      </template>

      <template #item.role="{ item }">
        <div class="d-flex align-center">
          <VChip v-if="item.role?.visible_name" size="small" class="me-2" variant="tonal" color="primary">
            {{ item.role.visible_name }}
          </VChip>
          <span v-else class="text-medium-emphasis">—</span>
        </div>
      </template>

      <template #item.date="{ item }">
        <span class="text-medium-emphasis">{{ item.created_at ? new Date(item.created_at).toLocaleString() : '—' }}</span>
      </template>

      <template v-if="isOrgAdmin" #item.actions="{ item }">
        <div v-if="currentUserId != item.user_id">
          <IconBtn v-if="showEditButton(item)" @click="openEditUser(item)"><VIcon icon="tabler-edit" /></IconBtn>
          <IconBtn @click="askDelete(item)"><VIcon icon="tabler-trash" /></IconBtn>
        </div>
      </template>

      <template #bottom>
        <VCardText class="pt-2">
          <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2"></div>
        </VCardText>
      </template>
    </VDataTableServer>
  </VCard>

  <VCard class="mt-6" v-if="isOrgAdmin">
    <VCardTitle class="mt-2 d-flex align-center justify-space-between">
      <span class="text-h6">Приглашения</span>
    </VCardTitle>

    <VDivider class="mt-2 mb-4" />

    <VDataTableServer
      :headers="invitationHeaders"
      class="text-no-wrap"
      :items="invitations"
      :items-length="invitations.length"
      :loading="loadingInvitations"
      :items-per-page="itemsPerPage"
    >
      <template #no-data>
        <div v-if="!loadingInvitations && total === 0">
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
          <span class="font-weight-medium">{{ item.email }}</span>
        </div>
      </template>

      <template #item.status="{ item }">
        <div class="d-flex align-center">
          <VChip
            v-if="item.status?.visible_name"
            size="small"
            class="me-2"
            variant="tonal"
            :color="getStatusColor(item.status)"
          >
            {{ item.status.visible_name }}
          </VChip>
          <span v-else class="text-medium-emphasis">—</span>
        </div>
      </template>

      <template #item.role="{ item }">
        <div class="d-flex align-center">
          <VChip v-if="item.role?.visible_name" size="small" class="me-2" variant="tonal" color="primary">
            {{ item.role.visible_name }}
          </VChip>
          <span v-else class="text-medium-emphasis">—</span>
        </div>
      </template>

      <template #item.date="{ item }">
        <span class="text-medium-emphasis">{{ item.created_at ? new Date(item.created_at).toLocaleString() : '—' }}</span>
      </template>

      <template #item.actions="{ item }">
        <VTooltip location="top" open-delay="120">
          <template #activator="{ props }">
            <IconBtn v-bind="props" @click="askDelete(item)"><VIcon icon="tabler-mail-cancel" /></IconBtn>
          </template>
          <span>Отменить приглашение</span>
        </VTooltip>
      </template>

      <template #bottom>
        <VCardText class="pt-2">
          <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2"></div>
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
        <VBtn variant="outlined" @click="userDialog = false">Отмена</VBtn>
        <VBtn variant="flat" color="primary" :loading="savingUser" @click="openEditUserRoleDialog(form)">
          {{ isInvite ? 'Отправить приглашение' : 'Сохранить' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Диalog: приглашение фулфилмента -->
  <VDialog v-model="fulfillmentDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ fulfillmentDialogTitle }}
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VForm ref="formRef" @submit.prevent="saveUser">
          <VRow>
            <VCol cols="12">
              <VSelect
                v-model="formInviteFf.id"
                :items="fullfilments"
                item-title="name"
                item-value="id"
                label="Организация"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="outlined" @click="fulfillmentDialog = false">Отмена</VBtn>
        <VBtn variant="flat" color="primary" :loading="invatingFf" @click="sendFfInvitation">
          Отправить приглашение
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Диalog: удалить / отменить -->
  <VDialog v-model="deleteDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ deleteTarget?.type === 'invitation' ? 'Отменить приглашение?' : 'Удалить пользователя?' }}
      </VCardTitle>
      <VCardText>
        <template v-if="deleteTarget?.type === 'invitation'">
          Вы действительно хотите отменить приглашение для
          <strong>{{ deleteTarget.email }}</strong>?
        </template>

        <template v-else-if="deleteTarget?.role?.id === 4">
          Вы действительно хотите исключить фулфилмент-организацию
          <strong>{{ deleteTarget?.name }}</strong> из списка?
        </template>

        <template v-else>
          Вы действительно хотите исключить пользователя
          <strong>{{ deleteTarget?.name }}</strong> из организации?
        </template>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="deleteDialog = false">Отмена</VBtn>
        <VBtn
          color="error"
          :loading="!!deletingId"
          @click="deleteTarget?.type === 'invitation' ? cancelInvitation() : confirmDelete()"
        >
          {{ deleteTarget?.type === 'invitation' ? 'Отменить' : 'Удалить' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Предупреждение о передаче роли -->
  <VDialog v-model="editUserRoleDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">Передача прав</VCardTitle>
      <VDivider />
      <VCardText>
        <span>
          Вы действительно передать роль
          <strong>{{ editDialogForm.roleVisibleName }}</strong>
          пользователю
          <strong>{{ editDialogForm.userName }}</strong>?
        </span>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" @click="editUserRoleDialog = false">Отмена</VBtn>
        <VBtn variant="outlined" @click="saveUser()">Продолжить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>
