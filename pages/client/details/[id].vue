```vue
<script setup lang="ts">
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { useFieldState } from '@/composables/useFieldState'
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VForm } from 'vuetify/components'
import CustomLoading from '../../../components/CustomLoading.vue'
import { createBrand, getBrands } from '../../../services/brands'
import { createClient, getClient, setFulfillment, updateClient } from '../../../services/clients'

import type { Brand } from '../../../types/brand'
import type { Client, CreateClientDto } from '../../../types/client'

import { useCurrentUser } from '@/composables/useCurrentUser'
import {
  account20Rule,
  bankNameRule,
  bicRule,
  corrAccount20Rule,
  formatRuPhone,
  innRule,
  ogrnipRule,
  optionalEmail,
  optionalRuPhone,
  required,
  requiredIf,
  stripDigits,
  telegramAtUsername,
  vatPercentRule,
} from '@/utils/validators'

const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string | undefined
const primaryId = idParam ? Number(idParam) : 0
const mode = ref<'create' | 'edit' | 'view'>('create')
const { isAdmin } = useCurrentUser()

const loading = ref(false)
const isFormInitialized = ref(false)
const originalForm = ref<Client | null>(null)
const isEdit = ref(false)
const isSaving = ref(false)

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const form = reactive<Client>({
  id: 0,
  name: '',
  type: '',
  is_fulfillment: false,
  phone: '',
  email: '',
  telegram: '',
  tin: '',
  psrn: '',
  account: '',
  bank: '',
  correspondent_account: '',
  bic: '',
  legal_address: '',
  vat: '',
  created_at: '',
  updated_at: '',
  deleted_at: null,
})

const copiedField = ref<string | null>(null)

const copyToClipboard = (text: string, field: string) => {
  if (text) {
    navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => {
      copiedField.value = null
    }, 2000)
  }
}

const onInnInput = (v: string) => {
  form.tin = v.replace(/[^0-9]/g, '').slice(0, form.type === 'INDIVIDUAL' ? 12 : 10)
}
const onOgrnipInput = (v: string) => {
  form.psrn = v.replace(/[^0-9]/g, '').slice(0, 15)
}
const onAccountInput = (v: string) => {
  form.account = v.replace(/[^0-9]/g, '').slice(0, 20)
}
const onCorrAccountInput = (v: string) => {
  form.correspondent_account = v.replace(/[^0-9]/g, '').slice(0, 20)
}
const onBicInput = (v: string) => {
  form.bic = v.replace(/[^0-9]/g, '').slice(0, 9)
}
const onPhoneInput = (v: string) => {
  let d = stripDigits(String(v || '')).slice(0, 11)
  if (d === '') { form.phone = ''; return }
  if (d[0] === '8') d = '7' + d.slice(1, 10)
  if (d[0] !== '7') d = '7' + d.slice(1, 10)
  form.phone = formatRuPhone(d)
}
const onTelegramInput = (v: string) => {
  let value = String(v || '').trim()
  if (value && !value.startsWith('@')) {
    value = '@' + value.replace(/^@+/, '')
  }
  form.telegram = value
}

function toVatPercent(v: any): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return ''
  const clamped = Math.max(0, Math.min(20, Math.floor(n)))
  return String(clamped)
}
const onVatInput = (v: string) => {
  form.vat = toVatPercent(v)
}

const onBankInput = (v: string) => {
  form.bank = String(v || '').replace(/[^A-Za-zА-Яа-я\s"'\-«»]/g, '')
}

type Rule = (v: any) => true | string
const submitted = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const changeTypeBtnVisible = computed(() => form.id && !form.is_fulfillment && isAdmin.value)

const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)
const { items: clientCrumbs } = useBreadcrumbs(
  'Клиенты',
  { name: 'client-list' },
  currentTitle,
  isCreate,
)

const tinRules = computed<Rule[]>(() => [required, innRule(() => form.type)])
const psrnRules = computed<Rule[]>(() => [
  requiredIf(() => form.type === 'INDIVIDUAL'),
  ogrnipRule,
])
const accountRules: Rule[] = [account20Rule]
const corrAccountRules: Rule[] = [corrAccount20Rule]
const bicRules: Rule[] = [bicRule]
const vatRules: Rule[] = [vatPercentRule]
const emailRules: Rule[] = [optionalEmail]
const telegramRules: Rule[] = [telegramAtUsername]
const phoneRules: Rule[] = [optionalRuPhone]
const bankRules: Rule[] = [bankNameRule]
const nameRules: Rule[] = [required]
const typeRules: Rule[] = [required]
const legalAddressRules: Rule[] = []


function mapServerResponseToForm(serverData: any): void {
  form.id = serverData.id || 0
  form.name = serverData.name || ''
  form.type = serverData.type || ''
  form.is_fulfillment = serverData.is_fulfillment || false
  form.phone = serverData.phone || ''
  form.email = serverData.email || ''
  form.telegram = serverData.telegram || ''
  form.tin = serverData.tin || ''
  form.psrn = serverData.psrn || ''
  form.account = serverData.account || ''
  form.bank = serverData.bank || ''
  form.correspondent_account = serverData.correspondent_account || ''
  form.bic = serverData.bic || ''
  form.legal_address = serverData.legal_address || ''
  form.vat = toVatPercent(serverData.vat)
  form.created_at = serverData.created_at || ''
  form.updated_at = serverData.updated_at || ''
  form.deleted_at = serverData.deleted_at || null

  originalForm.value = structuredClone(toRaw(form))
  submitted.value = false
}

const fieldsToTrack: (keyof Client)[] = [
  'name', 'type', 'phone', 'email', 'telegram', 'tin', 'psrn', 'account',
  'bank', 'correspondent_account', 'bic', 'legal_address', 'vat'
]
const isDirty = computed(() => {
  if (!originalForm.value) return false
  return fieldsToTrack.some(k => form[k] !== originalForm.value![k])
})
watch(isDirty, (dirty) => {
  if (mode.value === 'view' && isFormInitialized.value && primaryId > 0 && dirty) {
    mode.value = 'edit'
    submitted.value = false
  }
})

function buildSubmitPayload(f: Client): CreateClientDto {
  return {
    name: f.name,
    type: f.type,
    email: f.email,
    phone: f.phone,
    telegram: f.telegram,
    tin: f.tin,
    psrn: f.psrn,
    account: f.account,
    bank: f.bank,
    correspondent_account: f.correspondent_account,
    bic: f.bic,
    legal_address: f.legal_address,
    vat: f.vat,
  }
}

async function fetchClient(id: number) {
  loading.value = true
  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    mode.value = 'view'
    mapServerResponseToForm(data.value.data)
    isFormInitialized.value = true
  }
  loading.value = false
}

async function onSubmit() {
  submitted.value = true
  const res = await formRef.value?.validate?.()
  if (res && 'valid' in res && !res.valid) {
    snackColor.value = 'error'
    snackMessage.value = 'Проверьте заполнение полей'
    snackbar.value = true
    return
  }

  isSaving.value = true
  const dto = buildSubmitPayload(form) as CreateClientDto

  const response = mode.value === 'edit'
    ? await updateClient(primaryId, dto)
    : await createClient(dto)

  const { data, error } = response

  if (error.value) {
    snackColor.value = 'error'
    snackMessage.value = 'Ошибка сохранения клиента'
  } else {
    snackColor.value = 'success'
    snackMessage.value = mode.value === 'edit' ? 'Клиент обновлён' : 'Клиент создан'

    if (mode.value === 'edit') {
      originalForm.value = structuredClone(toRaw(form))
      mode.value = 'view'
      isEdit.value = false
      submitted.value = false
    }

    if (mode.value === 'create') {
      const newId = data.value.data.id
      router.push({ name: 'client-details-id', params: { id: newId } })
    }
  }

  snackbar.value = true
  isSaving.value = false
}

onMounted(() => {
  if (primaryId > 0) {
    fetchClient(primaryId)
    fetchBrands()
  } else {
    isEdit.value = true 
  }
})

function startEdit() {
  isEdit.value = true
}

function cancelEdit() {
  if (originalForm.value) {
    Object.assign(form, structuredClone(toRaw(originalForm.value)))
    isEdit.value = false
    mode.value = 'view'
    submitted.value = false
  }
}

async function fetchBrands() {
  loading.value = true
  const { data, error } = await getBrands()
  if (error.value) {
    console.error('Ошибка при загрузке брендов:', error.value)
  } else {
    mode.value = 'view'
    clientBrands.value = data.value
  }
  loading.value = false
}

const editedBrandVisible = ref(false)
const clientBrands = ref<Brand[]>([])
const editedBrand = reactive({
  name: '',
  clientId: primaryId,
})

const submitBrand = async () => {
  if (!editedBrandVisible.value) {
    editedBrandVisible.value = true
    return
  }

  loading.value = true
  try {
    const payload = {
      name: editedBrand.name,
      client_id: editedBrand.clientId
    }
    const { data, error } = await createBrand(payload)
    if (error.value) {
      snackColor.value = 'error'
      snackMessage.value = 'Ошибка при сохранении бренда'
    } else {
      snackColor.value = 'success'
      snackMessage.value = 'Бренд создан'
      const brand: Brand = data.value
      if (brand && brand.id && brand.name) {
        clientBrands.value.push({ name: brand.name, id: brand.id, client_id: brand.client_id })
      }
      editedBrand.name = ''
    }
    editedBrandVisible.value = false
    snackbar.value = true
  } catch (e) {
    console.error('Brand submit error:', e)
    snackColor.value = 'error'
    snackMessage.value = 'Неизвестная ошибка при сохранении бренда'
  } finally {
    loading.value = false
  }
}

const setAsFulfillment = async () => {
  loading.value = true
  try {
    const { data, error } = await setFulfillment(primaryId)
    snackColor.value = 'success'
    snackMessage.value = 'Организация установлена как фулфилмент'

    if (error.value || !data.value) {
      console.error('Error:', error)
      snackColor.value = 'error'
      snackMessage.value = 'Ошибка при обновлении'
    }
  } catch (error) {
    console.error('Request error:', error)
    snackColor.value = 'error'
    snackMessage.value = 'Ошибка при обновлении'
  } finally {
    loading.value = false
    snackbar.value = true
  }
}

const nameState  = useFieldState(nameRules,  computed(() => form.name),  submitted)
const typeState  = useFieldState(typeRules,  computed(() => form.type),  submitted)
const phoneState = useFieldState(phoneRules, computed(() => form.phone), submitted)
const emailState = useFieldState(emailRules, computed(() => form.email), submitted)
const tgState    = useFieldState(telegramRules, computed(() => form.telegram), submitted)
const tinState   = useFieldState(tinRules, computed(() => form.tin), submitted)
const psrnState  = useFieldState(psrnRules, computed(() => form.psrn), submitted)
const accState   = useFieldState(accountRules, computed(() => form.account), submitted)
const bankState  = useFieldState(bankRules, computed(() => form.bank), submitted)
const corrState  = useFieldState(corrAccountRules, computed(() => form.correspondent_account), submitted)
const bicState   = useFieldState(bicRules, computed(() => form.bic), submitted)
const vatState   = useFieldState(vatRules, computed(() => form.vat), submitted)
const legalState = useFieldState(legalAddressRules, computed(() => form.legal_address), submitted)
</script>

<template>
  <div>
    <AppBreadcrumbs :items="clientCrumbs" class="mb-2" />

    <VForm ref="formRef" :validate-on="submitted ? 'input' : 'blur'">
      <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
        <div class="d-flex flex-row align-center">
          <span class="text-h4 font-weight-medium">
            {{ mode === 'create' ? 'Вы создаете нового клиента' : form.name }}
          </span>
          <VBtn
            v-if="changeTypeBtnVisible"
            class="ms-4"
            size="small"
            variant="outlined"
            color="primary"
            @click="setAsFulfillment"
          >
            Назначить фулфилментом
          </VBtn>
        </div>
        <div class="d-flex gap-4 align-center flex-wrap">
          <VBtn v-if="isEdit" variant="outlined" color="primary" @click="cancelEdit">
            Отменить
          </VBtn>
          <VBtn v-if="!isEdit && mode !== 'create'" variant="outlined" color="primary" @click="router.back()">
            Закрыть
          </VBtn>
          <VBtn v-if="!isEdit" color="primary" @click="startEdit">
            Редактировать
          </VBtn>
          <VBtn v-if="isEdit" color="primary" :loading="isSaving" @click="onSubmit">
            Сохранить
          </VBtn>
        </div>
      </div>

      <VRow>
        <VCol md="4">
          <!-- Контакты -->
          <VCard class="mb-6">
            <VCardTitle>Контакты</VCardTitle>
            <VCardText class="pa-6 pt-0">
              <VRow>
                <VCol cols="12" md="12" v-if="!isEdit && mode !== 'create'">
                  <VList density="default">
                    <VListItem @click="copyToClipboard(form.phone, 'phone')">
                      <VListItemTitle>Телефон</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'phone'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'phone'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.phone || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'phone' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.email, 'email')">
                      <VListItemTitle>Email</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'email'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'email'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.email || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'email' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.telegram, 'telegram')">
                      <VListItemTitle>Telegram</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'telegram'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'telegram'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.telegram || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'telegram' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                  </VList>
                </VCol>
                <VCol cols="12" md="12" v-else>
                  <AppTextField
                    :model-value="form.phone"
                    label="Телефон"
                    outlined
                    :rules="phoneRules"
                    inputmode="tel"
                    maxlength="18"
                    v-bind="phoneState"
                    @update:modelValue="onPhoneInput"
                  />
                  <AppTextField
                    v-model="form.email"
                    label="Email"
                    outlined
                    :rules="emailRules"
                    v-bind="emailState"
                  />
                  <AppTextField
                    :model-value="form.telegram"
                    label="Telegram"
                    placeholder="@username"
                    outlined
                    :rules="telegramRules"
                    v-bind="tgState"
                    @update:modelValue="onTelegramInput"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Мои бренды -->
          <VCard title="Мои бренды" class="mb-6">
            <VCardText class="pa-6 pt-0">
              <VRow>
                <VCol md="12" class="pt-0 pb-0">
                  <VList class="pt-0 pb-0">
                    <template v-for="(brand, index) of clientBrands" :key="brand.id">
                      <AppTextField class="mb-4" v-model="brand.name" outlined readonly />
                    </template>
                  </VList>
                  <AppTextField class="mb-4" v-if="editedBrandVisible" v-model="editedBrand.name" outlined>
                    <template #append>
                      <VIcon
                        color="error"
                        icon="tabler-x"
                        @click="editedBrandVisible = !editedBrandVisible"
                      />
                    </template>
                  </AppTextField>
                </VCol>
                <VCol md="12">
                  <VBtn color="primary" @click="submitBrand">
                    <VIcon start :icon="editedBrandVisible ? 'tabler-check' : 'tabler-plus'" />
                    {{ editedBrandVisible ? "Сохранить" : "Добавить" }}
                  </VBtn>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>

        <VCol md="8">
          <!-- Реквизиты -->
          <VCard class="mb-6">
            <VCardTitle>Реквизиты</VCardTitle>
            <VCardText class="pa-6 pt-0">
              <VRow>
                <VCol cols="12" md="6" v-if="!isEdit && mode !== 'create'">
                  <VList density="default">
                    <VListItem @click="copyToClipboard(form.name, 'name')">
                      <VListItemTitle>Название</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'name'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'name'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.name || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'name' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(typeOptions.find(t => t.value === form.type)?.label || '', 'type')">
                      <VListItemTitle>Тип</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'type'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'type'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ typeOptions.find(t => t.value === form.type)?.label || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'type' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.tin, 'tin')">
                      <VListItemTitle>ИНН</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'tin'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'tin'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.tin || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'tin' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.psrn, 'psrn')">
                      <VListItemTitle>ОГРНИП</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'psrn'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'psrn'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.psrn || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'psrn' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.account, 'account')">
                      <VListItemTitle>Счёт</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'account'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'account'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.account || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'account' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                  </VList>
                </VCol>
                <VCol cols="12" md="6" v-if="!isEdit && mode !== 'create'">
                  <VList density="default">
                    <VListItem @click="copyToClipboard(form.correspondent_account, 'correspondent_account')">
                      <VListItemTitle>Корр. счёт</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'correspondent_account'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'correspondent_account'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.correspondent_account || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'correspondent_account' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.bank, 'bank')">
                      <VListItemTitle>Банк</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'bank'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'bank'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.bank || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'bank' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.bic, 'bic')">
                      <VListItemTitle>БИК</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'bic'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'bic'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.bic || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'bic' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.vat, 'vat')">
                      <VListItemTitle>НДС</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'vat'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'vat'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.vat ? `${form.vat}%` : 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'vat' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                    <VListItem @click="copyToClipboard(form.legal_address, 'legal_address')">
                      <VListItemTitle>Юридический адрес</VListItemTitle>
                      <VListItemSubtitle>
                        <VTooltip :model-value="copiedField === 'legal_address'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'legal_address'">
                          <template #activator="{ props }">
                            <span v-bind="props">{{ form.legal_address || 'Не указано' }}</span>
                          </template>
                          {{ copiedField === 'legal_address' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                        </VTooltip>
                      </VListItemSubtitle>
                    </VListItem>
                  </VList>
                </VCol>
                <VCol cols="12" md="6" v-if="isEdit || mode === 'create'">
                  <AppTextField
                    v-model="form.name"
                    label="Название"
                    placeholder="Введите название клиента"
                    outlined
                    :rules="nameRules"
                    v-bind="nameState"
                  />
                  <AppSelect
                    v-model="form.type"
                    :items="typeOptions"
                    item-title="label"
                    item-value="value"
                    label="Тип клиента"
                    placeholder="Выберите тип"
                    clearable
                    outlined
                    :rules="typeRules"
                    v-bind="typeState"
                  />
                  <AppTextField
                    :model-value="form.tin"
                    label="ИНН"
                    outlined
                    :rules="tinRules"
                    :maxlength="form.type === 'INDIVIDUAL' ? 12 : 10"
                    inputmode="numeric"
                    v-bind="tinState"
                    @update:modelValue="onInnInput"
                  />
                  <AppTextField
                    :model-value="form.psrn"
                    label="ОГРНИП"
                    outlined
                    :rules="psrnRules"
                    maxlength="15"
                    inputmode="numeric"
                    v-bind="psrnState"
                    @update:modelValue="onOgrnipInput"
                  />
                  <AppTextField
                    :model-value="form.account"
                    label="Счёт"
                    outlined
                    :rules="accountRules"
                    maxlength="20"
                    inputmode="numeric"
                    v-bind="accState"
                    @update:modelValue="onAccountInput"
                  />
                </VCol>
                <VCol cols="12" md="6" v-if="isEdit || mode === 'create'">
                  <AppTextField
                    :model-value="form.correspondent_account"
                    label="Корр. счёт"
                    outlined
                    :rules="corrAccountRules"
                    maxlength="20"
                    inputmode="numeric"
                    v-bind="corrState"
                    @update:modelValue="onCorrAccountInput"
                  />
                  <AppTextField
                    :model-value="form.bank"
                    label="Банк"
                    outlined
                    :rules="bankRules"
                    v-bind="bankState"
                    @update:modelValue="onBankInput"
                  />
                  <AppTextField
                    :model-value="form.bic"
                    label="БИК"
                    outlined
                    :rules="bicRules"
                    maxlength="9"
                    inputmode="numeric"
                    v-bind="bicState"
                    @update:modelValue="onBicInput"
                  />
                  <AppTextField
                    :model-value="form.vat"
                    label="НДС(%)"
                    outlined
                    :rules="vatRules"
                    inputmode="numeric"
                    maxlength="2"
                    v-bind="vatState"
                    @update:modelValue="onVatInput"
                  />
                  <AppTextField
                    v-model="form.legal_address"
                    label="Юридический адрес"
                    outlined
                    :rules="legalAddressRules"
                    v-bind="legalState"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VForm>

    <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
      {{ snackMessage }}
    </VSnackbar>

    <CustomLoading :loading="loading" />
  </div>
</template>

<style scoped lang="scss">
.view-mode .v-list-item {
  transition: background-color 0.2s ease;
  border-radius: 4px;
  margin-bottom: 4px;
}
.view-mode .v-list-item:hover {
  background-color: var(--v-theme-surface-variant);
}
:deep(.v-messages__message) {
  color: #000;
}
:deep(.v-input--error .v-messages__message) {
  color: var(--v-theme-error);
}
.v-card {
  border-radius: 8px;
}
.v-card-title {
  padding: 24px 24px 0;
}
.v-btn {
  border-radius: 6px;
  transition: transform 0.2s ease;
}
.v-btn:hover {
  transform: translateY(-2px);
}
</style>
