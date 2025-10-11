
<script setup lang="ts">
import { useCurrentClient } from '@/composables/useCurrentClient'
import { useFieldState } from '@/composables/useFieldState'
import { getClient, updateClient } from '@/services/clients'
import type { CreateClientDto } from '@/types/client'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { VForm } from 'vuetify/components'

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
  stripDigits,
  telegramAtUsername,
  vatPercentRule,
} from '@/utils/validators'

const { currentClient } = useCurrentClient()
const isEdit = ref(false)
const isSaving = ref(false)
const submitted = ref(false)
const formRef = ref<InstanceType<typeof VForm> | null>(null)
const copiedField = ref<string | null>(null)

const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]

const org = reactive<CreateClientDto>({
  name: '',
  type: '',
  email: '',
  phone: '',
  telegram: '',
  tin: '',
  psrn: '',
  account: '',
  bank: '',
  correspondent_account: '',
  bic: '',
  legal_address: '',
  vat: 0,
})

const originalData = reactive({ ...org })

function toVatPercent(v: any): string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n)) return ''
  const clamped = Math.max(0, Math.min(20, Math.floor(n)))
  return String(clamped)
}

function mapServerResponseToForm(serverData: any): void {
  org.name = serverData.name || ''
  org.type = serverData.type || ''
  org.email = serverData.email || ''
  org.phone = serverData.phone || ''
  org.telegram = serverData.telegram || ''
  org.tin = serverData.tin || ''
  org.psrn = serverData.psrn || ''
  org.account = serverData.account || ''
  org.bank = serverData.bank || ''
  org.correspondent_account = serverData.correspondent_account || ''
  org.bic = serverData.bic || ''
  org.legal_address = serverData.legal_address || ''

  org.vat = serverData.vat

  Object.assign(originalData, { ...org })
  submitted.value = false
}

async function fetchClient() {
  const id = Number(currentClient.value?.id)
  if (!id) return

  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    mapServerResponseToForm(data.value.data)
  }
}

watch(() => currentClient.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) fetchClient()
})

const onInnInput = (v: string) => {
  org.tin = String(v || '').replace(/[^0-9]/g, '').slice(0, org.type === 'INDIVIDUAL' ? 12 : 10)
}
const onOgrnipInput = (v: string) => {
  org.psrn = String(v || '').replace(/[^0-9]/g, '').slice(0, 15)
}
const onAccountInput = (v: string) => {
  org.account = String(v || '').replace(/[^0-9]/g, '').slice(0, 20)
}
const onCorrAccountInput = (v: string) => {
  org.correspondent_account = String(v || '').replace(/[^0-9]/g, '').slice(0, 20)
}
const onBicInput = (v: string) => {
  org.bic = String(v || '').replace(/[^0-9]/g, '').slice(0, 9)
}
const onBankInput = (v: string) => {
  org.bank = String(v || '').replace(/[^A-Za-zА-Яа-я\s"'\-«»]/g, '')
}
const onPhoneInput = (v: string) => {
  let d = stripDigits(String(v || '')).slice(0, 11)
  if (d === '') { org.phone = ''; return }
  if (d[0] === '8') d = '7' + d.slice(1, 10)
  if (d[0] !== '7') d = '7' + d.slice(1, 10)
  org.phone = formatRuPhone(d)
}
const onTelegramInput = (v: string) => {
  let value = String(v || '').trim()
  if (value && !value.startsWith('@')) {
    value = '@' + value.replace(/^@+/, '')
  }
  org.telegram = value
}

type Rule = (v: any) => true | string
const nameRules: Rule[] = [required]
const typeRules: Rule[] = [required]
const emailRules: Rule[] = [optionalEmail]
const phoneRules: Rule[] = [optionalRuPhone]
const telegramRules: Rule[] = [telegramAtUsername]
const tinRules = computed<Rule[]>(() => [required, innRule(() => org.type)])
const psrnRules = computed<Rule[]>(() => [
  (v: any) => (org.type === 'INDIVIDUAL' ? required(v) === true : true) || 'Обязательное поле',
  ogrnipRule,
])
const accountRules: Rule[] = [account20Rule]
const corrAccountRules: Rule[] = [corrAccount20Rule]
const bicRules: Rule[] = [bicRule]
const bankRules: Rule[] = [bankNameRule]
const vatRules: Rule[] = [vatPercentRule]
const legalAddressRules: Rule[] = []

const nameState = useFieldState(nameRules, computed(() => org.name), submitted)
const typeState = useFieldState(typeRules, computed(() => org.type), submitted)
const emailState = useFieldState(emailRules, computed(() => org.email), submitted)
const phoneState = useFieldState(phoneRules, computed(() => org.phone), submitted)
const tgState = useFieldState(telegramRules, computed(() => org.telegram), submitted)
const tinState = useFieldState(tinRules, computed(() => org.tin), submitted)
const psrnState = useFieldState(psrnRules, computed(() => org.psrn), submitted)
const accState = useFieldState(accountRules, computed(() => org.account), submitted)
const corrState = useFieldState(corrAccountRules, computed(() => org.correspondent_account), submitted)
const bankState = useFieldState(bankRules, computed(() => org.bank), submitted)
const bicState = useFieldState(bicRules, computed(() => org.bic), submitted)
const vatState = useFieldState(vatRules, computed(() => org.vat), submitted)
const addrState = useFieldState(legalAddressRules, computed(() => org.legal_address), submitted)

const startEdit = () => {
  isEdit.value = true
  Object.assign(originalData, { ...org })
  submitted.value = false
}

const cancel = () => {
  Object.assign(org, { ...originalData })
  isEdit.value = false
  submitted.value = false
}

const save = async () => {
  submitted.value = true
  const res = await formRef.value?.validate?.()
  if (res && 'valid' in res && !res.valid) return

  isSaving.value = true
  try {
    const { data, error } = await updateClient(Number(currentClient.value?.id), org)
    console.log(data)
    if (error.value) throw new Error(error.value.message)

    Object.assign(originalData, { ...org })
    isEdit.value = false
  } catch (e: any) {
    console.error('Ошибка при сохранении:', e?.message ?? e)
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = (text: string, field: string) => {
  if (text) {
    navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => {
      copiedField.value = null
    }, 2000) 
  }
}

onMounted(fetchClient)
</script>

<template>
  <VCard elevation="2" class="mb-4">
    <VCardTitle class="text-h6 pa-4">Реквизиты</VCardTitle>
    <VDivider />
    <VCardText>
      <VForm ref="formRef" :validate-on="submitted ? 'input' : 'blur'">
        <VRow v-if="!isEdit" class="view-mode">
          <!-- Режим просмотра -->
          <VCol cols="12" md="6">
            <VList density="comfortable">
              <VListItem @click="copyToClipboard(org.name, 'name')">
                <VListItemTitle>Название</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'name'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'name'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.name || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'name' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem>
                <VListItemTitle>Тип</VListItemTitle>
                <VListItemSubtitle>{{ typeOptions.find(t => t.value === org.type)?.label || 'Не указано' }}</VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.tin, 'tin')">
                <VListItemTitle>ИНН</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'tin'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'tin'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.tin || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'tin' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.psrn, 'psrn')">
                <VListItemTitle>ОГРНИП</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'psrn'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'psrn'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.psrn || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'psrn' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.account, 'account')">
                <VListItemTitle>Счёт</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'account'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'account'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.account || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'account' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
            </VList>
          </VCol>
          <VCol cols="12" md="6">
            <VList density="comfortable">
              <VListItem @click="copyToClipboard(org.correspondent_account, 'correspondent_account')">
                <VListItemTitle>Корр. счёт</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'correspondent_account'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'correspondent_account'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.correspondent_account || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'correspondent_account' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.bank, 'bank')">
                <VListItemTitle>Банк</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'bank'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'bank'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.bank || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'bank' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.bic, 'bic')">
                <VListItemTitle>БИК</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'bic'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'bic'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.bic || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'bic' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
              <VListItem>
                <VListItemTitle>НДС</VListItemTitle>
                <VListItemSubtitle>{{ org.vat ? `${org.vat}%` : 'Не указано' }}</VListItemSubtitle>
              </VListItem>
              <VListItem @click="copyToClipboard(org.legal_address, 'legal_address')">
                <VListItemTitle>Юридический адрес</VListItemTitle>
                <VListItemSubtitle>
                  <VTooltip :model-value="copiedField === 'legal_address'" location="top" :open-on-click="false" :open-on-hover="copiedField !== 'legal_address'">
                    <template #activator="{ props }">
                      <span v-bind="props">{{ org.legal_address || 'Не указано' }}</span>
                    </template>
                    {{ copiedField === 'legal_address' ? 'Скопировано!' : 'Нажмите, чтобы скопировать' }}
                  </VTooltip>
                </VListItemSubtitle>
              </VListItem>
            </VList>
          </VCol>
          <VCol cols="12" class="d-flex flex-wrap gap-4">
            <VBtn
              color="primary"
              @click="startEdit"
              class="text-capitalize"
              elevation="2"
            >
              Редактировать
            </VBtn>
          </VCol>
        </VRow>

        <!-- Режим редактирования -->
        <VRow v-else v-slide-y-transition>
          <VCol cols="12" md="6">
            <AppTextField
              v-model="org.name"
              label="Краткое название"
              outlined
              :rules="nameRules"
              v-bind="nameState"
            />
            <AppSelect
              v-model="org.type"
              :items="typeOptions"
              item-title="label"
              item-value="value"
              label="Тип"
              placeholder="Выберите тип"
              clearable
              outlined
              :rules="typeRules"
              v-bind="typeState"
            />
            <AppTextField
              :model-value="org.tin"
              label="ИНН"
              outlined
              :rules="tinRules"
              :maxlength="org.type === 'INDIVIDUAL' ? 12 : 10"
              inputmode="numeric"
              v-bind="tinState"
              @update:modelValue="onInnInput"
            />
            <AppTextField
              :model-value="org.psrn"
              label="ОГРНИП"
              outlined
              :rules="psrnRules"
              maxlength="15"
              inputmode="numeric"
              v-bind="psrnState"
              @update:modelValue="onOgrnipInput"
            />
            <AppTextField
              :model-value="org.account"
              label="Счёт"
              outlined
              :rules="accountRules"
              maxlength="20"
              inputmode="numeric"
              v-bind="accState"
              @update:modelValue="onAccountInput"
            />
          </VCol>
          <VCol cols="12" md="6">
            <AppTextField
              :model-value="org.correspondent_account"
              label="Корр. счёт"
              outlined
              :rules="corrAccountRules"
              maxlength="20"
              inputmode="numeric"
              v-bind="corrState"
              @update:modelValue="onCorrAccountInput"
            />
            <AppTextField
              :model-value="org.bank"
              label="Банк"
              outlined
              :rules="bankRules"
              v-bind="bankState"
              @update:modelValue="onBankInput"
            />
            <AppTextField
              :model-value="org.bic"
              label="БИК"
              outlined
              :rules="bicRules"
              maxlength="9"
              inputmode="numeric"
              v-bind="bicState"
              @update:modelValue="onBicInput"
            />
            <AppTextField
              :model-value="org.vat"
              label="НДС(%)"
              outlined
              :rules="vatRules"
              inputmode="numeric"
              type="number"
              maxlength="2"
              v-bind="vatState"
            />
            <AppTextField
              v-model="org.legal_address"
              label="Юридический адрес"
              outlined
              :rules="legalAddressRules"
              v-bind="addrState"
            />
          </VCol>
          <VCol cols="12" class="d-flex flex-wrap gap-4">
            <VBtn
              type="submit"
              color="primary"
              @click="save"
              :loading="isSaving"
              class="text-capitalize"
              elevation="2"
            >
              Сохранить изменения
            </VBtn>
            <VBtn
              variant="tonal"
              color="secondary"
              @click="cancel"
              class="text-capitalize"
              elevation="2"
            >
              Отмена
            </VBtn>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>

<style scoped>
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
.v-btn {
  border-radius: 6px;
  transition: transform 0.2s ease;
}
.v-btn:hover {
  transform: translateY(-2px);
}
</style>
