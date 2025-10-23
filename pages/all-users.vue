<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue'
import { updateClientUserRole } from '@/services/clientUsers'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createRole as apiCreateRole,
  deleteRole as apiDeleteRole,
  getRole as apiGetRole,
  listPermissions as apiListPermissions,
  listRoles as apiListRoles,
  updateRole as apiUpdateRole,
  type RoleItem, type SaveRoleDto,
} from '~/services/roles'
import {
  createUser, deleteUser, getUsers,
  type SaveUserDto, type User
} from '~/services/users'
import { email as emailRule, formatRuPhone, required, ruPhoneRule, stripDigits } from '~/utils/validators'

definePageMeta({
  requiresAdmin: true,
  middleware: ['super-admin-only']
})

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (t: string, c: 'success' | 'error' = 'success') => { snack.text = t; snack.color = c; snack.show = true }

interface ClientUserRole {
  id: number;
  visible_name: string;
}

interface ClientUser {
  id: number;
  client_name: string;
  client_id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  created_at: string;
  roles: ClientUserRole[];
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
    u.email?.toLowerCase().includes(q) 
    // || u.role?.visible_name?.toLowerCase().includes(q),
  )
})
const total = computed(() => filtered.value.length)
const pageRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filtered.value.slice(start, start + itemsPerPage.value)
})

const currentUserId = ref<number | null>(null)                      
const currentUserEmail = ref<string | null>(null) 
onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions()])

  const idStr = localStorage.getItem('user_id')
  if (idStr) {
    const n = Number(idStr)
    if (Number.isFinite(n)) currentUserId.value = n
  }
  const email = localStorage.getItem('user_email')
  if (email) currentUserEmail.value = email.toLowerCase()
})

const isCurrent = (u: { user_id?: number; email?: string }) => {    
  return (
    (currentUserId.value != null && u.user_id === currentUserId.value) ||
    (!!currentUserEmail.value && (u.email || '').toLowerCase() === currentUserEmail.value)
  )
}

async function fetchUsers() {
  loading.value = true
  try {
    const { data, error } = await getUsers()
    console.log(data.value)
    if (error.value) throw error.value
    rows.value = data.value || []
  } catch (e: any) {
    notify(e?.message || 'Не удалось загрузить пользователей', 'error')
  } finally { loading.value = false }
}

const userDialog = ref(false)
const userDialogTitle = ref('Пригласить пользователя')
const formRef = ref<any>(null)
const savingUser = ref(false)
const editedUserId = ref<number | null>(null)

const roles = ref<RoleItem[]>([])
const rolesOptions = ref<RoleItem[]>([
  { id: 1, name: 'admin', visible_name: 'Администратор' },
  { id: 2, name: 'manager', visible_name: 'Менеджер' },
  { id: 3, name: 'logistics', visible_name: 'Логист' },
])

const form = reactive<SaveUserDto>({ name: '', email: '', phone: '', address: '', role_id: 0 })
const updateRoleform = reactive({ client_id: 0, user_id: 0})
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
  userDialogTitle.value = 'Новый пользователь'
  editedUserId.value = null
  Object.assign(form, { name: '', email: '', phone: '', address: '', role: 0 })
  userDialog.value = true
}
function openEditUser(u: ClientUser) {
  userDialogTitle.value = 'Редактировать пользователя'
  editedUserId.value = u.user_id
  updateRoleform.client_id = u.client_id
  updateRoleform.user_id = u.user_id
  Object.assign(form, {
    name: u.name || '',
    email: u.email || '',
    phone: u.phone ? formatRuPhone(stripDigits(u.phone)) : '',
    address: u.address || '',
    role_id: u.roles[0] || 0,
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
      const { data, error } = await createUser(payload)
      if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось создать')
      rows.value.unshift(data.value.data)
      notify('Пользователь создан')
    } else {
      const updateClientUserRolePayload = {
        client_id: updateRoleform.client_id,
        user_id: updateRoleform.user_id,
        role_id: Number(form.role_id),
      }
      const { data, error } = await updateClientUserRole(updateClientUserRolePayload)
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
    const { data, error } = await deleteUser(deleteTarget.value.id)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось удалить')
    rows.value = rows.value.filter(r => r.id !== deleteTarget.value!.id)
    notify('Пользователь удалён')
  } catch (e:any) {
    notify(e?.message || 'Ошибка удаления', 'error')
  } finally {
    deletingId.value = null; deleteDialog.value = false; deleteTarget.value = null
  }
}

const rolesLoading = ref(false)
const rolesSearch = ref('')
const rolesPage = ref(1)
const rolesPerPage = ref(10)
const rolesList = ref<RoleItem[]>([])

type Permission = { id: number; name: string; visible_name?: string }
const permissionItems = ref<Permission[]>([])
const permTitleById = new Map<number, string>()

const filteredRoles = computed(() => {
  const q = rolesSearch.value.trim().toLowerCase()
  if (!q) return rolesList.value
  return rolesList.value.filter(r =>
    r.visible_name.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q),
  )
})
const rolesTotal = computed(() => filteredRoles.value.length)
const rolesPageRows = computed(() => {
  const start = (rolesPage.value - 1) * rolesPerPage.value
  return filteredRoles.value.slice(start, start + rolesPerPage.value)
})
watch([rolesPerPage, rolesSearch], () => { rolesPage.value = 1 })

async function fetchRoles() {
  rolesLoading.value = true
  try {
    const { data, error } = await apiListRoles()
    if (error.value) throw error.value
    const val: any = data.value
    rolesList.value = Array.isArray(val?.data) ? val.data : (val?.data || val || [])
    roles.value = rolesList.value
  } finally { rolesLoading.value = false }
}
async function fetchPermissions() {
  const { data, error } = await apiListPermissions()
  if (error.value) return
  const raw = (data.value as any)?.data || data.value || []
  permissionItems.value = raw as Permission[]
  permTitleById.clear()
  permissionItems.value.forEach(p => permTitleById.set(p.id, p.visible_name || p.name))
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions()])
})

const roleDialog = ref(false)
const roleDialogTitle = ref('Новая роль')
const savingRole = ref(false)
const editedRoleId = ref<number | null>(null)
const roleFormRef = ref<any>(null)
const roleForm = reactive<SaveRoleDto & { permissions: number[] }>({ name: '', visible_name: '', permissions: [] })

const slugRule = (v: string) =>
  /^[a-z0-9:_-]+$/.test(String(v || '')) || 'Только латиница, цифры, "-", "_", ":"'
const roleRules = { name: [required, slugRule], visible_name: [required] }

function openCreateRole() {
  roleDialogTitle.value = 'Новая роль'
  editedRoleId.value = null
  Object.assign(roleForm, { name: '', visible_name: '', permissions: [] })
  roleDialog.value = true
}

async function openEditRole(r: RoleItem) {
  roleDialogTitle.value = 'Редактировать роль'
  editedRoleId.value = r.id
  const { data, error } = await apiGetRole(r.id)
  if (!error.value && data.value?.success) {
    const full = data.value.data as any
    const ids: number[] = Array.isArray(full.permissions)
      ? full.permissions.map((p: any) => Number(p.id)).filter((x: any) => Number.isFinite(x))
      : []
    Object.assign(roleForm, { name: full.name, visible_name: full.visible_name, permissions: ids })
  } else {
    Object.assign(roleForm, { name: r.name, visible_name: r.visible_name, permissions: [] })
  }
  roleDialog.value = true
}

function normalizePermIds(arr: any[]): number[] {
  return (arr || []).map(v => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      const n = Number(v)
      return Number.isFinite(n) ? n : NaN
    }
    if (v && typeof v === 'object' && 'id' in v) return Number((v as any).id)
    return NaN
  }).filter(n => Number.isFinite(n)) as number[]
}

async function saveRole() {
  const res = await roleFormRef.value?.validate?.()
  if (res && res.valid === false) return

  const payload: SaveRoleDto = {
    name: roleForm.name,
    visible_name: roleForm.visible_name,
    permissions: normalizePermIds(roleForm.permissions),
  }

  savingRole.value = true
  try {
    if (editedRoleId.value == null) {
      const { data, error } = await apiCreateRole(payload)
      if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось создать роль')
      rolesList.value.unshift(data.value.data)
      roles.value = rolesList.value
      notify('Роль создана')
    } else {
      const { data, error } = await apiUpdateRole(editedRoleId.value, payload)
      if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось сохранить роль')
      const idx = rolesList.value.findIndex(x => x.id === editedRoleId.value)
      if (idx > -1) rolesList.value[idx] = data.value.data
      roles.value = rolesList.value
      notify('Изменения сохранены')
    }
    roleDialog.value = false
  } catch (e:any) {
    notify(e?.message || 'Ошибка сохранения роли', 'error')
  } finally { savingRole.value = false }
}

const roleDeleteDialog = ref(false)
const roleDeleteTarget = ref<RoleItem | null>(null)
const deletingRoleId = ref<number | null>(null)
function askDeleteRole(r: RoleItem) { roleDeleteTarget.value = r; roleDeleteDialog.value = true }
async function confirmDeleteRole() {
  if (!roleDeleteTarget.value) return
  deletingRoleId.value = roleDeleteTarget.value.id
  try {
    const { data, error } = await apiDeleteRole(roleDeleteTarget.value.id)
    if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось удалить роль')
    rolesList.value = rolesList.value.filter(r => r.id !== roleDeleteTarget.value!.id)
    roles.value = rolesList.value
    notify('Роль удалена')
  } catch (e:any) {
    notify(e?.message || 'Ошибка удаления роли', 'error')
  } finally {
    deletingRoleId.value = null; roleDeleteDialog.value = false; roleDeleteTarget.value = null
  }
}

const headers = [
  { title: 'Организация', key: 'data-table-group' },
  { title: 'Пользователь', key: 'name', sortable: false },
  { title: 'Доступ', key: 'role', sortable: false },
  { title: 'Дата создания', key: 'created_at', sortable: false },
  { title: 'Действия', key: 'actions', sortable: false},
]

const computedHeaders = computed(() => {
  const groupTitles: {user: {group: string, name: string}, client: {group: string, name: string}} = {
    user: { group: 'Пользователь', name: 'Организация' },
    client: { group: 'Организация', name: 'Пользователь' }
  }
  
  const currentTitles = groupTitles[groupUser.value as keyof typeof groupTitles] || groupTitles.user
  
  return headers.map(header => {
    if (header.key === 'data-table-group') {
      return { ...header, title: currentTitles.group }
    } else if (header.key === 'name') {
      return { ...header, title: currentTitles.name }
    }
    return header
  })
})

const roleTableHeaders = [
  { title: 'Название', key: 'visible_name', sortable: false },
  { title: 'Системное имя', key: 'name', sortable: false },
  { title: 'Разрешение', key: 'permissions', sortable: false },
  { title: 'Действия', key: 'actions', sortable: false},
]

const getIcon = (props: Record<string, unknown>) => props.icon as any
const groupBy = computed(() => {
  if (groupUser.value === "user") {
    return [{ key: 'user_id' }]
  } else if (groupUser.value === "client") {
    return [{ key: 'client_id' }]
  } else {
    return [{ key: 'user_id' }]
  }
})

const groupUser = ref("user")

const getGroupHeaderName = (item) => {
  switch (groupUser.value) {
    case "user":
      const user = pageRows.value.find(d => d.user_id === item.value)
      return user ? user.name : ''
    
    case "client":
      const client = pageRows.value.find(d => d.client_id === item.value)
      return client ? client.client_name : ''
    
    default:
      return item.value
  }
}

const getGroupHeaderEmail = (item) => {
  if (groupUser.value === "user") {
    const user = pageRows.value.find(d => d.user_id === item.value)
    return user ? user.email : ''
  }
  return ''
}

</script>

<template>
  <!-- Пользователи -->
  <VCard>
    <VCardTitle class="mt-2 d-flex align-center justify-space-between">
      <span class="text-h6">Пользователи системы</span>
      <div class="ms-2">
        <VBtn :variant="groupUser === 'user' ? 'flat' : 'outlined'" style="min-width: 150px" size="small" @click="groupUser='user'">
          <VIcon start icon="tabler-user" />
          Пользователи
        </VBtn>

        <VBtn  class="ms-2" :variant="groupUser === 'client' ? 'flat' : 'outlined'" style="min-width: 150px" size="small" @click="groupUser='client'">
          <VIcon start icon="tabler-building" />
          Организации
        </VBtn>
      </div>
      <div class="d-flex align-center gap-3 ms-auto">
        <VTextField v-model="search" placeholder="Поиск пользователя" hide-details density="comfortable" style="inline-size:320px" prepend-inner-icon="tabler-search" />
        <VBtn color="primary" prepend-icon="tabler-user-plus" @click="openCreateUser">Добавить Пользователя</VBtn>
      </div>
    </VCardTitle>
    <VDivider class="mt-2 mb-4" />
    <VDataTableServer 
      :headers="computedHeaders"
      class="text-no-wrap"
      :items="pageRows"
      :items-length="pageRows.length"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :group-by="groupBy"
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


      <template #item.client_name="{ item }">
        <div class="d-flex align-center">
          <!-- <span>{{ item.client_name }}</span> -->
          <RouterLink :to="{ name: 'client-details-id', params: { id: item.client_id } }" class="text-high-emphasis">
            {{ item.client_name }}
          </RouterLink>
          <VChip
            size="small" 
            class="ms-1" 
            variant="tonal" 
            color="primary"
          >
            ID: {{ item.client_id }}
          </VChip>
        </div>
      </template>
      <template #item.name="{ item }">
        <div v-if="groupUser === 'user'" class="d-flex align-center">
          <VIcon start icon="tabler-building" />
          <RouterLink :to="{ name: 'client-details-id', params: { id: item.client_id } }" class="text-high-emphasis">
            <span class="font-weight-medium">{{ item.client_name }}</span>
          </RouterLink>
        </div>
      
        <div v-else class="d-flex align-center">
          <UserAvatar
            :name="item.name"
            :last-name="''"
            size="36"
            rounded="circle"
            :font-size="16"
            class="me-3"
          />
          <div class="d-flex flex-column">
            <span class="font-weight-medium d-flex align-center">
              {{ item.name }}
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
            <small class="text-medium-emphasis">{{ item.email }}</small>
          </div>
        </div>
      </template>
      <template #item.role="{ item }">
        <div class="d-flex align-center flex-wrap gap-1">
          <template v-if="item.roles && item.roles.length">
            <div
              v-for="data in item.roles" 
              :key="data.id"
            >
              <VChip
                size="small" 
                class="me-1" 
                variant="tonal" 
                color="primary"
              >
                {{ data.visible_name }}
              </VChip>
            </div>
          </template>
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

      <template #data-table-group="{ props, item }">
        <td>
          <div class="d-flex align-center gap-2">
            <VBtn v-bind="props" variant="text" density="comfortable" class="flex-shrink-0">
              <VIcon class="flip-in-rtl" :icon="getIcon(props)" />
            </VBtn>
            <template v-if="groupUser === 'user'">
              <UserAvatar
                :name="getGroupHeaderName(item)"
                :last-name="''"
                size="36"
                rounded="circle"
                :font-size="16"
                class="flex-shrink-0 me-2"
              />
            </template>
          
            <div class="d-flex flex-column min-width-0">
              <span class="font-weight-medium text-truncate d-flex align-center">
                {{ getGroupHeaderName(item) }}
                <VChip
                  v-if="groupUser === 'user' && currentUserId !== null && item.value === currentUserId"
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="ms-2"
                >
                  Это вы
                </VChip>
              
                <VChip size="x-small" class="ms-1" variant="tonal" color="primary">
                  ID: {{ item.value }}
                </VChip>
              </span>
            
              <small class="text-medium-emphasis text-truncate">{{ getGroupHeaderEmail(item) }}</small>
            </div>
          </div>
        </td>
      </template>

      
      <template #bottom>  
        <VCardText class="pt-2">
          <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
            <!-- <div class="d-flex align-center gap-2">
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
            /> -->
          </div>
        </VCardText>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Диалоговое окно -->
  <VDialog v-model="userDialog" max-width="560">
    <VCard>
      <VCardTitle class="text-h6">{{ userDialogTitle }}</VCardTitle>
      <VDivider />
      <VCardText>
        <VForm ref="formRef" @submit.prevent="saveUser">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField append-inner-icon="tabler-lock" readonly  v-model="form.name" label="Имя" :rules="userRules.name" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField append-inner-icon="tabler-lock" readonly  v-model="form.email" type="email" label="Email" :rules="userRules.email" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                append-inner-icon="tabler-lock" readonly
                :model-value="form.phone"
                label="Телефон"
                placeholder="+7 (___) ___-__-__"
                :rules="userRules.phone"
                @update:model-value="onPhoneInput"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField append-inner-icon="tabler-lock" readonly v-model="form.address" label="Адрес" />
            </VCol>
            <VCol cols="12">
              <VSelect 
                v-model="form.role_id"
                :items="rolesOptions"
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
        <VBtn variant="text" @click="userDialog=false">Отмена</VBtn>
        <VBtn color="primary" :loading="savingUser" @click="saveUser">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Пользователь -->
  <VDialog v-model="deleteDialog" max-width="460">
    <VCard>
      <VCardTitle class="text-h6">Удалить пользователя?</VCardTitle>
      <VCardText>
        Это действие необратимо. Пользователь
        <strong v-if="deleteTarget">{{ deleteTarget.name }}</strong>
        будет удалён.
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="deleteDialog=false">Отмена</VBtn>
        <VBtn color="error" :loading="!!deletingId" @click="confirmDelete">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Роли -->
  <VCard class="mt-6">
    <VCardTitle class="mt-2 d-flex align-center justify-space-between">
      <span class="text-h6">Роли и доступы</span>
      <div class="d-flex align-center gap-3 ms-auto">
        <VTextField v-model="rolesSearch" placeholder="Поиск роли" hide-details density="comfortable" prepend-inner-icon="tabler-search" style="inline-size:320px" />
        <VBtn color="primary" prepend-icon="tabler-plus" @click="openCreateRole">Добавить роль</VBtn>
      </div>
    </VCardTitle>
    <VDivider class="mt-2 mb-4" />

    <VDataTableServer 
      :headers="roleTableHeaders"
      class="text-no-wrap"
      :items="rolesPageRows"
      :items-length="pageRows.length"
      :loading="loading"
      :items-per-page="itemsPerPage"
    >
      <template #no-data>
        <div v-if="!loading && total === 0">
          <span class="text-center py-6 text-medium-emphasis">Ролей нет</span>
        </div>
      </template>

      <template #loading>
        <div class="text-center pa-6">
          <div class="d-flex justify-center pa-6"><VProgressCircular indeterminate /></div>
        </div>
      </template>

      <template #item.actions="{ item }">
        <IconBtn @click="openEditRole(item)"><VIcon icon="tabler-edit" /></IconBtn>
        <IconBtn @click="askDeleteRole(item)"><VIcon icon="tabler-trash" /></IconBtn>
      </template>

      <template #bottom>  
        <VCardText class="pt-2">
          <div class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 mt-2">
          </div>
        </VCardText>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Выбор роли -->
  <VDialog v-model="roleDialog" max-width="560">
    <VCard>
      <VCardTitle class="text-h6">{{ roleDialogTitle }}</VCardTitle>
      <VDivider />
      <VCardText>
        <VForm ref="roleFormRef" @submit.prevent="saveRole">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField v-model="roleForm.visible_name" label="Отображаемое имя" :rules="[required]" />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField v-model="roleForm.name" label="Системное имя (slug)" :rules="[required, v => /^[a-z0-9:_-]+$/.test(String(v||'')) || 'Только латиница, цифры, -, _, :']" />
            </VCol>
            <VCol cols="12">
              <VCombobox
                v-model="roleForm.permissions"
                :items="permissionItems"
                item-title="visible_name"
                item-value="id"
                :return-object="false"
                multiple
                chips
                closable-chips
                label="Разрешения"
                hint="Выберите или начните вводить"
                persistent-hint
              />

            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="roleDialog=false">Отмена</VBtn>
        <VBtn color="primary" :loading="savingRole" @click="saveRole">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Подтверждение удаления -->
  <VDialog v-model="roleDeleteDialog" max-width="460">
    <VCard>
      <VCardTitle class="text-h6">Удалить роль?</VCardTitle>
      <VCardText>Роль <strong v-if="roleDeleteTarget">{{ roleDeleteTarget.visible_name }}</strong> будет удалена.</VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="roleDeleteDialog=false">Отмена</VBtn>
        <VBtn color="error" :loading="!!deletingRoleId" @click="confirmDeleteRole">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>
</template>
