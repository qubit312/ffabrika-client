<script setup lang="ts">

import { useCurrentClient } from '@/composables/useCurrentClient';
import { getClient } from '@/services/clients';
import { stripDigits } from '@/utils/validators';
import { reactive, ref, watch } from 'vue';

const { currentClient } = useCurrentClient()
async function fetchClient(id: number) {
  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    mapServerResponseToForm(data.value.data)
  }
}

watch(() => currentClient.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchClient(Number(newId))
  }
})

watch(() => currentClient.value?.id, (newId) => {
  if (newId) {
    fetchClient(Number(newId))
  }
}, { immediate: true })

function mapServerResponseToForm(serverData: any): void {
  org.name = serverData.name || ''
  org.type = serverData.type || ''
  org.phone = serverData.phone || ''
  org.tin = serverData.tin || ''
  org.psrn = serverData.psrn || ''
  org.account = serverData.account || ''
  org.bank = serverData.bank || ''
  org.correspondent_account = serverData.correspondent_account || ''
  org.bic = serverData.bic || ''
  org.legal_address = serverData.legal_address || ''
  org.vat = stripDigits(String(serverData.vat ?? ''))
}

const isEdit = ref(false)
const isSaving = ref(false)
const startEdit = () => {  isEdit.value = true }
const cancel = () => {

  isEdit.value = false
}
const org = reactive({
  name: '',
  type: '',
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
})
const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]
const save = async () => {
}
</script>

<template>
  <VCard>
    <VCardTitle class="text-h6">Реквизиты</VCardTitle>
    <VDivider />
    <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.name" label="Краткое название" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="org.type"
                  :items="typeOptions"
                  item-title="label"
                  item-value="value"
                  label="Тип"
                  placeholder="Выберите тип"
                  clearable
                  outlined
                />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.tin" label="ИНН" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.psrn" label="ОГРНИП" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.account" label="Счёт" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.correspondent_account" label="Корр. счёт" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.bank" label="Банк" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.bic" label="БИК" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.vat" label="НДС" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.legal_address" label="Юридический адрес" outlined />
              </VCol>
              <VCol cols="12" class="d-flex flex-wrap gap-4">
                <VBtn v-if="!isEdit" color="primary" @click="startEdit">Редактировать</VBtn>
                <template v-else>
                  <VBtn type="submit" color="primary" :loading="isSaving">Сохранить изменения</VBtn>
                  <VBtn variant="tonal" color="secondary" @click="cancel">Отмена</VBtn>
                </template>
              </VCol>
            </VRow>
          </VCardText>
   

  </VCard>
</template>
