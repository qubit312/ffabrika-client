<script setup lang="ts">
import laptopGirl from '@/assets/images/illustrations/laptop-girl.png'
import { checkConnection, createMarketplaceAccount, deleteMarketplaceAccount, getMarketplaceAccounts, importWbProduct, updateMarketplaceAccount } from '@/services/marketplaceAccounts'
import { MarketplaceAccountStatus, type CreateMarketplaceAccountDto, type MarketplaceAccount, type UpdateMarketplaceAccountDto } from '@/types/marketplaceAccount'
import { getStatusColor, getStatusLabel } from '@/utils/marketplace-account-status'
import { onMounted, reactive, ref } from 'vue'

const platforms = [{ title: 'Wildberries', value: 'WB' as const }]

const formRef = ref<any>(null)
const saving = ref(false)
const showToken = ref(false)
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
    if (apiError.value) {
      console.error('Ошибка создания аккаунта:', apiError.value)
      return
    }

    if (data.value) {
      const newAccount = data.value
      rows.value.unshift(newAccount)

      form.name = ''
      form.api_token_enc = ''
      showToken.value = false
      formRef.value?.resetValidation?.()
    } else {
      // error.value = 'Сервер вернул пустой ответ'
    }
  } catch (err: any) {
    // error.value = err.message || 'Неизвестная ошибка при создании аккаунта'
    console.error('Неожиданная ошибка:', err)
  } finally {
    saving.value = false
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

const importProduct = async (id: number) => {
  try {
    importLoading.value = true
    const dto = {
      'marketplace_account_id': id
    }
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
    importLoading.value = false
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
      error.value = apiError.value.message || 'Ошибка при сохранении изменений'
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
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="form.api_token_enc"
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
                <VListItem @click="importProduct(row.id)">
                  <template #prepend><VIcon icon="tabler-activity" class="me-2" /></template>
                  <VListItemTitle>Импортировать товары</VListItemTitle>
                </VListItem>

              </VList>
            </VMenu>
          </div>
        </VSheet>
      </div>
    </VCardText>
  </VCard>

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

  <VDialog v-model="importResult.show" max-width="600" persistent>
    <VCard>
      <VCardTitle class="d-flex justify-space-between align-center">
        <span>Результаты импорта</span>
        <VBtn icon variant="text" @click="importResult.show = false">
          <VIcon>tabler-x</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VList>
          <VListItem>
            <VListItemTitle class="font-weight-medium">
              Обработано товаров: {{ importResult.total_processed }}
            </VListItemTitle>
          </VListItem>
          <VListItem><VListItemTitle>Создано: {{ importResult.created }}</VListItemTitle></VListItem>
          <VListItem><VListItemTitle>Обновлено: {{ importResult.updated }}</VListItemTitle></VListItem>
        </VList>

        <VAlert v-if="importResult.errors.length" type="error" class="mt-4">
          <VList>
            <VListItem v-for="(error, index) in importResult.errors" :key="index" class="pa-0">
              <VListItemTitle class="text-error">{{ error }}</VListItemTitle>
            </VListItem>
          </VList>
        </VAlert>

        <VAlert v-else type="success" class="mt-4">
          Все товары успешно обработаны!
        </VAlert>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn color="primary" @click="importResult.show = false">Закрыть</VBtn>
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
