<script setup lang="ts">
import laptopGirl from '@/assets/images/illustrations/laptop-girl.png'
import { onMounted, reactive, ref } from 'vue'

type StoreItem = {
  id: number
  platform: 'Wildberries'
  name: string
  token: string
  active: boolean
  created_at: string
  updated_at: string
}

const LS_KEY = 'demo_stores'

const platforms = [{ title: 'Wildberries', value: 'Wildberries' as const }]

const formRef = ref<any>(null)
const saving = ref(false)
const showToken = ref(false)
const form = reactive({
  platform: 'Wildberries' as StoreItem['platform'],
  name: '',
  token: '',
})

const rules = {
  required: (v: any) => !!String(v || '').trim() || 'Обязательное поле',
  tokenMin: (v: string) => String(v || '').length >= 10 || 'Минимум 10 символов',
}

const rows = ref<StoreItem[]>([])
const loadingCheckId = ref<number | null>(null)

function load() {
  try {
    rows.value = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch { rows.value = [] }
}
function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(rows.value))
}

async function onSubmit() {
  const res = await formRef.value?.validate?.()
  if (res && res.valid === false) return

  saving.value = true
  try {
    const now = new Date().toISOString()
    rows.value.unshift({
      id: Date.now(),
      platform: form.platform,
      name: form.name.trim() || 'Без названия',
      token: form.token,
      active: true,
      created_at: now,
      updated_at: now,
    })
    persist()
    form.name = ''
    form.token = ''
    showToken.value = false
    formRef.value?.resetValidation?.()
  } finally { saving.value = false }
}

function fmt(s?: string) {
  return s ? new Date(s).toLocaleString() : '—'
}

function simulateCheck(row: StoreItem) {
  loadingCheckId.value = row.id
  setTimeout(() => {
    row.active = true
    row.updated_at = new Date().toISOString()
    persist()
    loadingCheckId.value = null
  }, 800)
}

function toggleActive(row: StoreItem) {
  row.active = !row.active
  row.updated_at = new Date().toISOString()
  persist()
}

function removeRow(id: number) {
  rows.value = rows.value.filter(r => r.id !== id)
  persist()
}

const renameDialog = ref(false)
const renameValue = ref('')
let renameTarget: StoreItem | null = null
function openRename(row: StoreItem) {
  renameTarget = row
  renameValue.value = row.name
  renameDialog.value = true
}
function saveRename() {
  if (renameTarget) {
    renameTarget.name = renameValue.value.trim() || renameTarget.platform
    renameTarget.updated_at = new Date().toISOString()
    persist()
  }
  renameDialog.value = false
  renameTarget = null
}

onMounted(load)
</script>

<template>
  <VCard class="mb-6">
    <VCardText class="pt-6">
      <h2 class="section-title text-high-emphasis mb-4">Подключить магазин через API</h2>

      <VRow>
        <VCol cols="12" md="6">
          <VForm ref="formRef" validate-on="submit" @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <VSelect
                  v-model="form.platform"
                  :items="platforms"
                  item-title="title"
                  item-value="value"
                  label="Выберите магазин"
                  hide-details
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="form.name"
                  label="Название магазина (обязательное поле)"
                  :rules="[rules.required]"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="form.token"
                  :type="showToken ? 'text' : 'password'"
                  label="Создайте токен и укажите его в этом поле"
                  placeholder="Введите API-токен"
                  :append-inner-icon="showToken ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="showToken = !showToken"
                  :rules="[rules.required, rules.tokenMin]"
                />
              </VCol>

              <VCol cols="12">
                <VBtn block color="primary" size="large" :loading="saving" type="submit">
                  Подключить
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCol>
        <VCol cols="12" md="6" class="illustration-col">
          <VImg :src="laptopGirl" alt="Illustration" class="illustration-img" />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>

  <VCard>
    <VCardText class="pt-6">
      <h2 class="section-title text-h6 text-high-emphasis mb-4">Управление магазинами</h2>

      <VAlert v-if="rows.length === 0" type="info" variant="tonal" class="mb-4">
        Пока нет подключённых магазинов — добавьте первый через форму выше.
      </VAlert>

      <div v-else class="d-flex flex-column gap-4">
        <VSheet
          v-for="row in rows"
          :key="row.id"
          class="store-row d-flex align-center justify-space-between rounded-lg pa-4"
        >
          <div>
            <div class="d-flex align-center flex-wrap gap-3">
              <span class="text-subtitle-1 font-weight-medium">
                Название магазина : {{ row.name || row.platform }}
              </span>
              <VChip :color="row.active ? 'success' : 'secondary'" size="small" variant="tonal">
                {{ row.active ? 'Активный' : 'Выключен' }}
              </VChip>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              Создан: {{ fmt(row.created_at) }} · Обновлён: {{ fmt(row.updated_at) }}
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <VBtn
              size="small"
              color="primary"
              variant="tonal"
              class="me-2"
              :loading="loadingCheckId === row.id"
              @click="simulateCheck(row)"
            >
              Проверить Подключение
            </VBtn>

            <IconBtn class="me-1" @click="openRename(row)">
              <VIcon icon="tabler-edit" />
            </IconBtn>

            <IconBtn class="me-1" @click="removeRow(row.id)">
              <VIcon icon="tabler-trash" />
            </IconBtn>

            <VMenu>
              <template #activator="{ props }">
                <IconBtn v-bind="props"><VIcon icon="tabler-dots-vertical" /></IconBtn>
              </template>
              <VList>
                <VListItem @click="simulateCheck(row)">
                  <template #prepend><VIcon icon="tabler-activity" class="me-2" /></template>
                  <VListItemTitle>Проверить</VListItemTitle>
                </VListItem>

              </VList>
            </VMenu>
          </div>
        </VSheet>
      </div>
    </VCardText>
  </VCard>

  <VDialog v-model="renameDialog" max-width="420">
    <VCard>
      <VCardTitle class="text-h6">Переименовать магазин</VCardTitle>
      <VCardText>
        <VTextField v-model="renameValue" label="Новое название" autofocus />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="renameDialog=false">Отмена</VBtn>
        <VBtn color="primary" @click="saveRename">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped lang="scss">
.section-title {
  font-weight: 700;
  letter-spacing: .2px;
}

.illustration-col {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  min-height: 120px;
}
.illustration-img {
  inline-size: 100%;
  max-inline-size: 220px;
  block-size: auto;
}

.store-row {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
