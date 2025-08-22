<script setup lang="ts">
import { useLegalDocs } from '@core/stores/legalDocs'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useLegalDocs()
store.load()

const id = computed(() => String(route.params.id))
const doc = computed(() => store.getDoc(id.value))

const isEdit = ref(false)
const isSaving = ref(false)

const draftTitle = ref('')
const draftContent = ref('')

watchEffect(() => {
  if (doc.value) {
    draftTitle.value = doc.value.title
    draftContent.value = doc.value.content || ''
  }
})

const startEdit = () => { isEdit.value = true }
const cancel = () => {
  if (doc.value) {
    draftTitle.value = doc.value.title
    draftContent.value = doc.value.content || ''
  }
  isEdit.value = false
}
const save = async () => {
  if (!doc.value) return
  isSaving.value = true
  try {
    store.updateDoc(id.value, { title: draftTitle.value, content: draftContent.value })
    await new Promise(r => setTimeout(r, 300))
    isEdit.value = false
  } finally { isSaving.value = false }
}

const back = () => router.push('/account/legal')
</script>

<template>
  <VCard v-if="doc">
    <VCardTitle class="d-flex align-center gap-3">
      <VBtn variant="text" icon="tabler-arrow-left" @click="back" />
      <span>{{ isEdit ? 'Редактирование документа' : 'Документ' }}</span>
      <VSpacer />
      <VBtn v-if="!isEdit" color="primary" @click="startEdit">Редактировать</VBtn>
      <template v-else>
        <VBtn color="primary" :loading="isSaving" @click="save">Сохранить изменения</VBtn>
        <VBtn variant="tonal" color="secondary" @click="cancel">Отмена</VBtn>
      </template>
    </VCardTitle>
    <VDivider />

    <VCardText>
      <VTextField v-model="draftTitle" label="Название" :disabled="!isEdit" />
      <VTextarea v-model="draftContent" label="Содержимое" rows="12" :disabled="!isEdit" auto-grow />

      <div class="text-medium-emphasis mt-4">
        Обновлено: {{ new Date(doc.updatedAt).toLocaleString() }}
      </div>
    </VCardText>
  </VCard>

  <VAlert v-else type="error" variant="tonal">Документ не найден</VAlert>
</template>
