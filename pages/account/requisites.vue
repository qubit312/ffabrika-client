<script setup lang="ts">


const org = reactive({
  companyName: '',
  inn: '',
  kpp: '',
  ogrn: '',
  address: '',
  bank: '',
  bik: '',
  account: '',
})

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
                <AppTextField v-model="org.tin" label="ИНН" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.psrn" label="ОГРНИП" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.account" label="Счёт" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.bank" label="Банк" outlined />
              </VCol>
              <VCol cols="12" md="6">
                <AppTextField v-model="org.correspondent_account" label="Корр. счёт" outlined />
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
              <VCol cols="12" md="6">
                <AppTextField v-model="org.wb_api_token" label="Токен WB API" outlined />
              </VCol>
            </VRow>
          </VCardText>
   
    <VCardActions>
      <VBtn color="primary" @click="save">Сохранить</VBtn>
    </VCardActions>
  </VCard>
</template>
