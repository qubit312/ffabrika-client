<script setup lang="ts">
import avatarFallback from '@images/avatars/avatar-1.png'
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
  createUser, deleteUser, getUsers, updateUser,
  type SaveUserDto, type User,
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
    const { data, error } = await getUsers()
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

const roles = ref<RoleItem[]>([])
const form = reactive<SaveUserDto>({ name: '', email: '', phone: '', address: '', role: 0 })
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
function openEditUser(u: User) {
  userDialogTitle.value = 'Редактировать пользователя'
  editedUserId.value = u.id
  Object.assign(form, {
    name: u.name || '',
    email: u.email || '',
    phone: u.phone ? formatRuPhone(stripDigits(u.phone)) : '',
    address: u.address || '',
    role: u.role?.id || 0,
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
      role: Number(form.role),
    }
    if (editedUserId.value == null) {
      const { data, error } = await createUser(payload)
      if (error.value || !data.value?.success) throw new Error(data.value?.message || 'Не удалось создать')
      rows.value.unshift(data.value.data)
      notify('Пользователь создан')
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
</script>

<template>
  <!-- Пользователи -->
  <VCard>
    <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
      <div class="d-flex align-center gap-3">
        <span class="text-body-2">Show</span>
        <VSelect v-model="itemsPerPage" :items="[10,25,50,100]" hide-details density="comfortable" style="inline-size:84px" />
      </div>

      <div class="d-flex align-center gap-3 ms-auto">
        <VTextField v-model="search" placeholder="Search Permissions" hide-details density="comfortable" style="inline-size:320px" prepend-inner-icon="tabler-search" />
        <VBtn color="primary" prepend-icon="tabler-user-plus" @click="openCreateUser">Добавить Пользователя</VBtn>
      </div>
    </VCardText>

    <VDivider />

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th class="text-subtitle-2">ПОЛЬЗОВАТЕЛЬ</th>
          <th style="inline-size:24px;">|</th>
          <th class="text-subtitle-2">ДОСТУП</th>
          <th style="inline-size:24px;">|</th>
          <th class="text-subtitle-2">ДАТА И ВРЕМЯ</th>
          <th style="inline-size:24px;">|</th>
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
          <td></td>
          <td>
            <VChip v-if="u.role?.visible_name" size="small" class="me-2" variant="tonal" color="primary">{{ u.role.visible_name }}</VChip>
            <span v-else class="text-medium-emphasis">—</span>
          </td>
          <td></td>
          <td><span class="text-medium-emphasis">{{ u.created_at ? new Date(u.created_at).toLocaleString() : '—' }}</span></td>
          <td></td>
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
        Showing {{ Math.min((page-1)*itemsPerPage+1, total) }} to {{ Math.min(page*itemsPerPage, total) }} of {{ total }} entries
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
            <VCol cols="12" md="6"><VTextField v-model="form.name" label="Имя" :rules="userRules.name" /></VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.email" type="email" label="Email" :rules="userRules.email" /></VCol>
            <VCol cols="12" md="6">
              <VTextField :model-value="form.phone" label="Телефон" placeholder="+7 (___) ___-__-__" :rules="userRules.phone" @update:model-value="onPhoneInput" />
            </VCol>
            <VCol cols="12" md="6"><VTextField v-model="form.address" label="Адрес" /></VCol>
            <VCol cols="12">
              <VSelect v-model="form.role" :items="roles" item-title="visible_name" item-value="id" label="Роль" :rules="userRules.role" />
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
    <VCardTitle class="d-flex align-center justify-space-between">
      <span class="text-h6">Роли и доступы</span>
      <VBtn color="primary" prepend-icon="tabler-plus" @click="openCreateRole">Добавить роль</VBtn>
    </VCardTitle>
    <VDivider />
    <VCardText class="d-flex align-center gap-3">
      <VTextField v-model="rolesSearch" placeholder="Поиск роли" hide-details density="comfortable" prepend-inner-icon="tabler-search" />
    </VCardText>

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th>Название</th>
          <th>Системное имя</th>
          <th>Разрешения</th>
          <th class="text-right">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rolesPageRows" :key="r.id">
          <td>{{ r.visible_name }}</td>
          <td class="text-medium-emphasis">{{ r.name }}</td>
          <td class="text-medium-emphasis">—</td>
          <td class="text-right">
            <IconBtn @click="openEditRole(r)"><VIcon icon="tabler-edit" /></IconBtn>
            <IconBtn @click="askDeleteRole(r)"><VIcon icon="tabler-trash" /></IconBtn>
          </td>
        </tr>
        <tr v-if="rolesTotal === 0">
          <td colspan="4" class="text-center py-6 text-medium-emphasis">Ролей нет</td>
        </tr>
      </tbody>
    </VTable>

    <VDivider />
    <div class="d-flex align-center justify-space-between pa-4">
      <div class="text-body-2 text-medium-emphasis">
        Showing {{ Math.min((rolesPage-1)*rolesPerPage+1, rolesTotal) }}
        to {{ Math.min(rolesPage*rolesPerPage, rolesTotal) }}
        of {{ rolesTotal }} entries
      </div>
      <VPagination v-model="rolesPage" :length="Math.max(Math.ceil(rolesTotal / rolesPerPage), 1)" density="comfortable" rounded="lg" show-first-last-page />
    </div>
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
