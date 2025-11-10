<script setup lang="ts">
import laptopGirl from '@/assets/images/illustrations/laptop-girl.png'
import { checkConnection, createMarketplaceAccount, deleteMarketplaceAccount, getMarketplaceAccounts, importWbProduct, updateMarketplaceAccount } from '@/services/marketplaceAccounts'
import { MarketplaceAccountStatus, type CreateMarketplaceAccountDto, type MarketplaceAccount, type UpdateMarketplaceAccountDto } from '@/types/marketplaceAccount'
import { getStatusColor, getStatusLabel } from '@/utils/marketplace-account-status'
import { onMounted, reactive, ref } from 'vue'

const platforms = [{ title: 'Wildberries', value: 'WB' as const }]

const formRef = ref<any>(null)
const saving = ref(false)

const form = reactive<CreateMarketplaceAccountDto>({
  platform: 'WB' as MarketplaceAccount['platform'],
  name: '',
  api_token_enc: '',
})

const rules = {
  required: (v: any) => !!String(v || '').trim() || 'Обязательное поле',
  tokenMin: (v: string) => String(v || '').length >= 10 || 'Минимум 10 символов',
}

const rows = ref<MarketplaceAccount[]>([])
const loadingCheckId = ref<number | null>(null)

const loading = ref(true)
const importLoading = ref(true)

async function load() {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await getMarketplaceAccounts()
    
    if (fetchError.value) {
      throw new Error(fetchError.value.message || 'Ошибка загрузки данных')
    }
    
    rows.value = data.value || []
  } catch (err) {
    // error.value = err.message
    rows.value = []
    console.error('Ошибка загрузки магазинов:', err)
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  const res = await formRef.value?.validate?.()
  if (res && res.valid === false) return

  saving.value = true
  
  try {
    const createDto: CreateMarketplaceAccountDto = {
      platform: form.platform,
      name: form.name.trim() || 'Без названия',
      api_token_enc: form.api_token_enc,
      status: MarketplaceAccountStatus.NOT_CONFIGURED,
    }

    const { data, error: apiError } = await createMarketplaceAccount(createDto)
    if (apiError.value?.data) {
      const errorMessage = apiError.value?.data?.message || "Ошибка при добавлении магазина"
      notify(errorMessage, 'error')
      saving.value = false
      return
    }

    if (data.value.success) {
      const newAccount = data.value.data
      rows.value.unshift(newAccount)

      notify('Магазин успешно добавлен')  // ← вот эта строка

      form.name = ''
      form.api_token_enc = ''
      formRef.value?.resetValidation?.()
    }
  } catch (err: any) {
    console.error('Неожиданная ошибка:', err)
  } finally {
    saving.value = false
    load()
  }
}

function fmt(s?: string | null) {
  return s ? new Date(s).toLocaleString() : '—'
}

const importResult = reactive({
  show: false,
  success: false,
  total_processed: 0,
  created: 0,
  updated: 0,
  errors: [] as string[]
})
const importingId = ref<number | null>(null)

const importProduct = async (id: number) => {
  importingId.value = id
  try {
    const dto = { marketplace_account_id: id }
    const { data, error } = await importWbProduct(dto)
    if (error.value) throw new Error(error.value.message || 'Ошибка при импорте товаров')

    if (data.value) {
      Object.assign(importResult, {
        show: true,
        success: data.value.success,
        total_processed: data.value.total_processed || 0,
        created: data.value.created || 0,
        updated: data.value.updated || 0,
        errors: data.value.errors || []
      })
    }
  } catch (e) {
    Object.assign(importResult, {
      show: true,
      success: false,
      errors: [e instanceof Error ? e.message : 'Неизвестная ошибка']
    })
  } finally {
    importingId.value = null
  }
}


async function simulateCheck(id: number) {
  loadingCheckId.value = id;

  try {
    const { data, error: apiError } = await checkConnection(id);
    if (apiError.value) {
      console.error('Ошибка API при проверке подключения:', apiError.value);
      return;
    }
    
    if (data.value) {
      const result = data.value;
      
      const index = rows.value.findIndex(r => r.id === id);
      if (index !== -1) {
        rows.value[index] = {
          ...rows.value[index],
          status: result.account?.status || rows.value[index].status,
          error_message: result.account?.error_message,
          last_checked_at: result.account?.last_checked_at || new Date().toISOString()
        };
      }
    } else {
      console.warn('Пустой ответ от сервера');
    }
  } catch (error: any) {
    console.error('Неожиданная ошибка при проверке подключения:', error);   
  } finally {
    loadingCheckId.value = null;
  }
}

// function toggleActive(row: MarketplaceAccount) {
//   row.active = !row.active
//   row.updated_at = new Date().toISOString()
// }
const deletingId = ref<number | null>(null)
const error = ref<string | null>(null)

async function removeRow(id: number) {
  deletingId.value = id
  error.value = null
  
  try {
    const { error: apiError } = await deleteMarketplaceAccount(id)
    
    if (apiError.value) {
      error.value = apiError.value.message || 'Ошибка при удалении аккаунта'
      console.error('Ошибка удаления аккаунта:', apiError.value)    
      return
    }
    
    rows.value = rows.value.filter(r => r.id !== id)
  } catch (err: any) {
    error.value = err.message || 'Неизвестная ошибка при удалении'
    console.error('Неожиданная ошибка:', err)   
  } finally {
    deletingId.value = null
  }
}

const confirmDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)

function askDelete(id: number) {
  deleteTargetId.value = id
  confirmDeleteDialog.value = true
}

const snack = reactive({ show: false, text: '', color: 'success' as 'success' | 'error' })
const notify = (text: string, color: 'success' | 'error' = 'success') => {
  snack.text = text
  snack.color = color
  snack.show = true
}


async function confirmDelete() {
  if (!deleteTargetId.value) return
  deletingId.value = deleteTargetId.value
  await removeRow(deleteTargetId.value)
  confirmDeleteDialog.value = false
  notify('Магазин успешно удалён')
  deletingId.value = null
  deleteTargetId.value = null
}



const renameDialog = ref(false)
const renameValue = ref('')
const tokenValue = ref('')
let renameTarget: MarketplaceAccount | null = null
function openRename(row: MarketplaceAccount) {
  renameTarget = row
  renameValue.value = row.name
  tokenValue.value = ''
  renameDialog.value = true
}

// function saveRename() {
//   if (renameTarget) {
//     renameTarget.name = renameValue.value.trim() || renameTarget.platform
//     renameTarget.updated_at = new Date().toISOString()
//   }
//   renameDialog.value = false
//   renameTarget = null
// }

async function saveRename() {
  if (!renameTarget) return

  saving.value = true
  error.value = null

  try {
    const updateDto: UpdateMarketplaceAccountDto = {
      name: renameValue.value.trim() || renameTarget.platform,
    }

    if (tokenValue.value) {
      updateDto.api_token_enc = tokenValue.value;
    }

    const { data, error: apiError } = await updateMarketplaceAccount(renameTarget.id, updateDto)
    
    if (apiError.value) {
      console.log(apiError.value.data)
      error.value = apiError.value.data.message || 'Ошибка при сохранении изменений'
      console.error('Ошибка обновления аккаунта:', apiError.value)      
      return
    }

    if (data.value) {
      const updatedAccount = data.value
      
      const index = rows.value.findIndex(r => r.id === renameTarget?.id)
      if (index !== -1) {
        rows.value[index] = { ...rows.value[index], ...updatedAccount }
      }
    } else {
      error.value = 'Сервер вернул пустой ответ'
    }
    
  } catch (err: any) {
    error.value = err.message || 'Неизвестная ошибка при сохранении'
    console.error('Неожиданная ошибка:', err)   
  } finally {
    saving.value = false
    renameDialog.value = false
    renameTarget = null
    load()
  }
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
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </VCol>
              
              <VCol cols="12">
                <VTextarea
                  v-model="form.api_token_enc"
                  label="Создайте токен и укажите его в этом поле"
                  placeholder="Введите API-токен"
                  auto-grow
                  rows="3"
                  :rules="[rules.required, rules.tokenMin]"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
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

      <div v-if="loading" class="d-flex justify-center py-8">
        <VProgressCircular indeterminate color="primary" />
      </div>

      <VAlert v-else-if="rows.length === 0" type="info" variant="tonal" class="mb-4">
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
              <VChip :color="getStatusColor(row.status)" size="small" variant="tonal">
                {{ getStatusLabel(row.status) }}
              </VChip>
            </div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              Создан: {{ fmt(row.created_at) }} · Обновлён: {{ fmt(row.last_checked_at) }}
            </div>
          </div>

          <div class="d-flex align-center gap-2">
            <VBtn
              size="small"
              color="primary"
              variant="tonal"
              class="me-2"
              :loading="loadingCheckId === row.id"
              @click="simulateCheck(row.id)"
            >
              Проверить Подключение
            </VBtn>
            <VBtn
              size="small"
              color="secondary"
              variant="flat"
              prepend-icon="tabler-download"
              :loading="importingId === row.id"
              @click="importProduct(row.id)"
            >
              Импортировать товары
            </VBtn>
            <IconBtn class="me-1" @click="openRename(row)">
              <VIcon icon="tabler-edit" />
            </IconBtn>
            <IconBtn class="me-1" @click="askDelete(row.id)">
              <VIcon icon="tabler-trash" />
            </IconBtn>
          </div>
        </VSheet>
      </div>
    </VCardText>
  </VCard>
  <VDialog v-model="confirmDeleteDialog" max-width="400">
    <VCard>
      <VCardTitle class="text-h6">Удалить магазин?</VCardTitle>
      <VCardText>
        Это действие необратимо. Магазин и связанные данные будут удалены.
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          variant="tonal"
          color="secondary"
          @click="confirmDeleteDialog = false"
          :disabled="!!deletingId"
        >
          Отмена
        </VBtn>
        <VBtn
          color="error"
          :loading="!!deletingId"
          :disabled="!!deletingId"
          @click="confirmDelete"
        >
          Удалить
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  <VDialog v-model="renameDialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">Обновить магазин</VCardTitle>
      <VCardText>
        <VTextField v-model="renameValue" class="mb-6" label="Новое название" autofocus />
        <VTextField v-model="tokenValue" label="Новый API ключ" />
        <div class="text-caption text-disabled mt-1 ml-2">
          <strong>*</strong> Оставьте поле пустым, если не хотите менять токен
        </div>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="renameDialog=false">Отмена</VBtn>
        <VBtn color="primary" @click="saveRename">Сохранить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VDialog v-model="importResult.show" max-width="520" transition="scale-transition" persistent>
    <VCard
      class="rounded-l pa-4"
      :color="importResult.success ? 'success-container' : 'error-container'"
      elevation="12"
    >
      <div class="text-center mb-2">
        <VAvatar
          size="72"
          class="mb-3 elevation-4"
          :color="importResult.success ? 'success' : 'error'"
        >
          <VIcon
            size="40"
            :icon="importResult.success ? 'tabler-check' : 'tabler-alert-circle'"
            color="white"
          />
        </VAvatar>

        <h3 class="text-h6 font-weight-bold mb-1">
          {{ importResult.success ? 'Импорт завершён успешно!' : 'Импорт завершён с ошибками' }}
        </h3>
        <p class="text-medium-emphasis mb-4">
          {{ importResult.success
            ? 'Все данные успешно обработаны и добавлены в систему.'
            : 'Некоторые товары не удалось импортировать.' }}
        </p>
      </div>

      <VSheet
        class="pa-4 rounded-lg mb-4"
        color="surface"
        elevation="1"
      >
        <VRow>
          <VCol cols="4" sm="4" class="d-flex flex-column align-center justify-center text-center">
            <div class="text-body-2 text-medium-emphasis">Обработано товаров</div>
            <div class="text-h6 font-weight-medium">{{ importResult.total_processed }}</div>
          </VCol>
          <VCol cols="4" sm="4" class="d-flex flex-column align-center justify-center text-center">
            <div class="text-body-2 text-medium-emphasis">Создано</div>
            <div class="text-h6 text-success font-weight-medium">{{ importResult.created }}</div>
          </VCol>
          <VCol cols="4" sm="4" class="d-flex flex-column align-center justify-center text-center">
            <div class="text-body-2 text-medium-emphasis">Обновлено</div>
            <div class="text-h6 text-info font-weight-medium">{{ importResult.updated }}</div>
          </VCol>
        </VRow>
      </VSheet>

      <VAlert
        v-if="importResult.errors.length"
        type="error"
        variant="tonal"
        density="comfortable"
        border="start"
        class="mb-4"
      >
        <template #title>Ошибки импорта</template>
        <ul class="error-list">
          <li v-for="(error, i) in importResult.errors" :key="i">{{ error }}</li>
        </ul>
      </VAlert>

      <VAlert
        v-else
        type="success"
        variant="tonal"
        density="comfortable"
        border="start"
        class="mb-4"
      >
        Все товары успешно обработаны!
      </VAlert>

      <VCardActions class="justify-center">
        <VBtn
          color="primary"
          variant="flat"
          size="large"
          rounded="lg"
          prepend-icon="tabler-check"
          @click="importResult.show = false"
        >
          Отлично
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
  <VSnackbar v-model="snack.show" :color="snack.color" location="top end" timeout="2500">
    {{ snack.text }}
  </VSnackbar>

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
