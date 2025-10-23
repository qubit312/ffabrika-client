<script setup lang="ts">
import { useLegalDocs } from '@core/stores/legalDocs'

const store = useLegalDocs()
store.load()

const router = useRouter()

const addDialog = ref(false)
const addTitle = ref('')
const addFile = ref<File | null>(null)

const onPickFile = (e: Event) => {
  addFile.value = (e.target as HTMLInputElement).files?.[0] || null
}

const createDoc = async () => {
  if (!addTitle.value.trim()) return
  let fileUrl: string | undefined
  if (addFile.value) fileUrl = URL.createObjectURL(addFile.value)
  const id = store.addDoc({
    title: addTitle.value.trim(),
    content: !addFile.value ? '' : undefined,
    fileName: addFile.value?.name,
    fileUrl,
  })
  addDialog.value = false
  addTitle.value = ''
  addFile.value = null
  router.push(`/account/legal/${id}`)
}

const openDoc = (id: string) => router.push(`/account/legal/${id}`)
const removeDoc = (id: string) => store.removeDoc(id)
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center">
      <span>Юридические документы</span>
      <VBtn color="primary" prepend-icon="tabler-plus" @click="addDialog = true">
        Добавить документ
      </VBtn>
    </VCardTitle>
    <VDivider />

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th>Название</th>
          <th style="width:220px">Обновлён</th>
          <th style="width:180px" class="text-right">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in store.docs" :key="d.id">
          <td>{{ d.title }}</td>
          <td>{{ new Date(d.updatedAt).toLocaleString() }}</td>
          <td class="text-right">
            <VBtn variant="text" size="small" @click="openDoc(d.id)">Открыть</VBtn>
            <VBtn variant="text" size="small" color="error" @click="removeDoc(d.id)">Удалить</VBtn>
          </td>
        </tr>
        <tr v-if="!store.docs.length">
          <td colspan="3" class="text-medium-emphasis">Пока нет документов</td>
        </tr>
      </tbody>
    </VTable>
  </VCard>

  <VDialog v-model="addDialog" max-width="560">
    <VCard>
      <VCardTitle>Новый документ</VCardTitle>
      <VDivider />
      <VCardText>
        <VTextField v-model="addTitle" label="Название" autofocus />
        <VFileInput
          label="Файл (необязательно)"
          accept=".pdf,.txt,.doc,.docx"
          prepend-icon="tabler-file"
          @change="onPickFile"
        />
        <p class="text-medium-emphasis mt-2">
          Или оставьте без файла и задайте текст на странице документа.
        </p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="addDialog=false">Отмена</VBtn>
        <VBtn color="primary" :disabled="!addTitle.trim()" @click="createDoc">Создать</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
