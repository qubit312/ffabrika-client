<script setup lang="ts">
import { useCurrentClient } from '@/composables/useCurrentClient';
import { getClient, updateClient } from '@/services/clients';
import type { CreateClientDto } from '@/types/client';
import { stripDigits } from '@/utils/validators';
import { onMounted, reactive, ref, watch } from 'vue';

const { currentClient } = useCurrentClient()
const typeOptions = [
  { label: 'Юридическое лицо', value: 'LEGAL_ENTITY' },
  { label: 'Индивидуальный предприниматель', value: 'INDIVIDUAL' },
]
async function fetchClient() {
  var id = Number(currentClient.value?.id);
  if (!id) {
    return
  }
  const { data, error } = await getClient(id)
  if (error.value) {
    console.error('Ошибка при загрузке клиента:', error.value)
  } else {
    mapServerResponseToForm(data.value.data)
  }
}

watch(() => currentClient.value?.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    fetchClient()
  }
})

function mapServerResponseToForm(serverData: any): void {
  org.name = serverData.name || ''
  org.type = serverData.type || ''
  org.tin = serverData.tin || ''
  org.psrn = serverData.psrn || ''
  org.account = serverData.account || ''
  org.bank = serverData.bank || ''
  org.correspondent_account = serverData.correspondent_account || ''
  org.bic = serverData.bic || ''
  org.legal_address = serverData.legal_address || ''
  org.vat = stripDigits(String(serverData.vat ?? ''))

  Object.assign(originalData, { ...org })
}

const isEdit = ref(false)
const isSaving = ref(false)
const startEdit = () => {  
  isEdit.value = true
  Object.assign(originalData, { ...org })
}
const cancel = () => {
  Object.assign(org, { ...originalData })
  isEdit.value = false
}

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
  vat: '',
})

const originalData = reactive({ ...org })
const save = async () => {
  isSaving.value = true
  try {
    const { error } = await updateClient(Number(currentClient.value?.id), org)
    if (error.value) {
      throw new Error(error.value.message)
    }
    
    Object.assign(originalData, { ...org })
    isEdit.value = false
    
  } catch (error: any) {
    console.error('Ошибка при сохранении:', error.message)
  } finally {
    isEdit.value = false
    isSaving.value = false
  }
}

onMounted(() => {
  fetchClient()
})
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
            :readonly="!isEdit"
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
          <AppTextField :readonly="!isEdit" v-model="org.tin" label="ИНН" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.psrn" label="ОГРНИП" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.account" label="Счёт" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.correspondent_account" label="Корр. счёт" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.bank" label="Банк" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.bic" label="БИК" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField type="number" :readonly="!isEdit" v-model="org.vat" label="НДС" outlined />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField :readonly="!isEdit" v-model="org.legal_address" label="Юридический адрес" outlined />
        </VCol>
        <VCol cols="12" class="d-flex flex-wrap gap-4">
          <VBtn v-if="!isEdit" color="primary" @click="startEdit">Редактировать</VBtn>
          <template v-else>
            <VBtn type="submit" color="primary" @click="save" :loading="isSaving">Сохранить изменения</VBtn>
            <VBtn variant="tonal" color="secondary" @click="cancel">Отмена</VBtn>
          </template>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
