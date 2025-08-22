<script setup lang="ts">

const users = ref([
  { id: 1, name: 'Иван', email: 'ivan@example.com', role: 'Менеджер' },
])

const dialog = ref(false)
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center justify-space-between">
      <span class="text-h6">Пользователи</span>
      <VBtn color="primary" prepend-icon="tabler-user-plus" @click="dialog = true">Добавить</VBtn>
    </VCardTitle>
    <VDivider />
    <VTable>
      <thead>
        <tr>
          <th>Имя</th><th>Email</th><th>Роль</th><th class="text-right">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.name }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.role }}</td>
          <td class="text-right">
            <VBtn icon size="small" variant="text"><VIcon icon="tabler-edit" /></VBtn>
            <VBtn icon size="small" variant="text"><VIcon icon="tabler-trash" /></VBtn>
          </td>
        </tr>
      </tbody>
    </VTable>

    <VDialog v-model="dialog" max-width="540">
      <VCard>
        <VCardTitle>Новый пользователь</VCardTitle>
        <VDivider />
        <VCardText>
          <VTextField label="Имя" />
          <VTextField label="Email" />
          <VSelect :items="['Менеджер','Оператор','Администратор']" label="Роль" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="dialog=false">Отмена</VBtn>
          <VBtn color="primary">Создать</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>
