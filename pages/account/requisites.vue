<script setup lang="ts">

const isEdit = ref(false)
const isSaving = ref(false)
const startEdit = () => {  isEdit.value = true }
const cancel = () => {

  isEdit.value = false
}
const org = reactive({
  shortname:'',
  type: '',
  companyName: '',
  inn: '',
  kpp: '',
  ogrn: '',
  address: '',
  bank: '',
  bik: '',
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
                <AppTextField v-model="org.shortname" label="Краткое название" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppSelect
                  v-model="org.type"
                  :items="typeOptions"
                  item-title="label"
                  item-value="value"
                  label="Тип клиента"
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
