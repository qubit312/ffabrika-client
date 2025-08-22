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
        <VCol cols="12" md="6"><VTextField v-model="org.companyName" label="Наименование организации" /></VCol>
        <VCol cols="12" md="3"><VTextField v-model="org.inn" label="ИНН" /></VCol>
        <VCol cols="12" md="3"><VTextField v-model="org.kpp" label="КПП" /></VCol>
        <VCol cols="12" md="6"><VTextField v-model="org.ogrn" label="ОГРН/ОГРНИП" /></VCol>
        <VCol cols="12" md="6"><VTextField v-model="org.address" label="Юр. адрес" /></VCol>
        <VCol cols="12" md="4"><VTextField v-model="org.bank" label="Банк" /></VCol>
        <VCol cols="12" md="4"><VTextField v-model="org.bik" label="БИК" /></VCol>
        <VCol cols="12" md="4"><VTextField v-model="org.account" label="Р/с" /></VCol>
      </VRow>
    </VCardText>
    <VCardActions>
      <VBtn color="primary" @click="save">Сохранить</VBtn>
    </VCardActions>
  </VCard>
</template>
