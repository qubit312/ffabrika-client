<script setup lang="ts">
import {
  createSystemText,
  getSystemText,
  updateSystemTextById,
  type SystemText,
} from '@/services/systemTexts'
import { computed, defineAsyncComponent, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const key = computed(() => String(route.params.key || ''))
const isCreate = computed(() => key.value === 'new')

const { data, pending, error, refresh } = await useAsyncData<SystemText | null>(
  'system-text',
  async () => {
    if (!key.value || isCreate.value) return null
    try {
      return await getSystemText(key.value)
    } catch {
      return null
    }
  },
  { watch: [key], default: () => null }
)

const doc = computed(() => data.value)

const isEdit = ref(false)
const isSaving = ref(false)

const draftKey = ref('')     
const draftTitle = ref('')
const draftContent = ref('')

watchEffect(() => {
  if (isCreate.value) {
    draftKey.value = ''
    draftTitle.value = ''
    draftContent.value = ''
    isEdit.value = true
    return
  }
  if (doc.value) {
    draftKey.value = doc.value.key
    draftTitle.value = doc.value.title
    draftContent.value = doc.value.content
  }
})

const startEdit = () => { if (!isCreate.value) isEdit.value = true }

const cancel = () => {
  if (!isCreate.value && doc.value) {
    draftKey.value = doc.value.key
    draftTitle.value = doc.value.title
    draftContent.value = doc.value.content
  }
  isEdit.value = false
}

const save = async () => {
  isSaving.value = true
  try {
    if (isCreate.value) {
      if (!draftKey.value.trim() || !draftTitle.value.trim()) return
      const created = await createSystemText({
        key: draftKey.value.trim(),
        title: draftTitle.value.trim(),
        content: draftContent.value || '',
      })
      await router.replace(`/legal/${encodeURIComponent(created.key)}`)
      await refresh()
      isEdit.value = false
    } else {
      if (!doc.value?.id) return
      const oldKey = doc.value.key
      const updated = await updateSystemTextById(doc.value.id, {
        key: draftKey.value.trim(),
        title: draftTitle.value,
        content: draftContent.value,
      } as any) 
      data.value = updated
      isEdit.value = false
      if (draftKey.value.trim() && draftKey.value.trim() !== oldKey) {
        await router.replace(`/legal/${encodeURIComponent(draftKey.value.trim())}`)
      }
    }
  } finally {
    isSaving.value = false
  }
}

const back = () => router.push('/legal')

const QuillEditor = defineAsyncComponent(() =>
  import('@vueup/vue-quill').then(m => m.QuillEditor)
)

const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const normalized = iso.replace(/\.\d+Z$/, 'Z')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU')
}
</script>

<template>
  <VAlert v-if="!isCreate && error" type="error" variant="tonal">Документ не найден</VAlert>

  <VCard v-else>
    <VCardTitle class="d-flex align-center gap-3">
      <VBtn variant="text" icon="tabler-arrow-left" @click="back" />
      <span>
        {{ isCreate ? 'Новый документ' : (isEdit ? 'Редактирование документа' : 'Документ') }}
      </span>
      <VSpacer />
      <template v-if="isCreate">
        <VBtn
          color="primary"
          :loading="isSaving"
          :disabled="!draftKey.trim() || !draftTitle.trim()"
          @click="save"
        >
          Создать
        </VBtn>
        <VBtn variant="tonal" color="secondary" @click="back">Отмена</VBtn>
      </template>
      <template v-else>
        <VBtn v-if="!isEdit" color="primary" :disabled="pending || !doc" @click="startEdit">
          Редактировать
        </VBtn>
        <template v-else>
          <VBtn color="primary" :loading="isSaving" @click="save">Сохранить изменения</VBtn>
          <VBtn variant="tonal" color="secondary" @click="cancel">Отмена</VBtn>
        </template>
      </template>
    </VCardTitle>

    <VDivider />

    <VCardText v-if="pending && !isCreate">Загрузка…</VCardText>

    <VCardText v-else-if="isCreate">
      <VTextField
        v-model="draftKey"
        label="Ключ (уникально, латиницей)"
        placeholder="privacy_policy"
        class="mb-3"
      />
      <VTextField v-model="draftTitle" label="Название" class="mb-4" />
      <ClientOnly>
        <div class="rounded border" style="min-height: 320px">
          <QuillEditor
            v-model:content="draftContent"
            theme="snow"
            content-type="html"
            toolbar="full"
            style="min-height:280px"
          />
        </div>
      </ClientOnly>
    </VCardText>

    <VCardText v-else-if="doc && !isEdit">
      <div class="mb-2 text-h6">{{ doc.title }}</div>
      <div class="text-medium-emphasis mb-4">
        Обновлено: {{ fmtDate(doc.updated_at) }}
        <span class="ml-3">Ключ: <code>{{ doc.key }}</code></span>
      </div>
      <div v-html="doc.content"></div>
    </VCardText>

    <VCardText v-else-if="doc && isEdit">
      <VTextField
        v-model="draftKey"
        label="Ключ (можно менять)"
        class="mb-3"
      />
      <VTextField
        v-model="draftTitle"
        label="Название"
        class="mb-4"
      />
      <ClientOnly>
        <div class="rounded border" style="min-height: 320px">
          <QuillEditor
            v-model:content="draftContent"
            theme="snow"
            content-type="html"
            toolbar="full"
            style="min-height:280px"
          />
        </div>
      </ClientOnly>
      <div class="text-medium-emphasis mt-4">
        Обновлено: {{ fmtDate(doc.updated_at) }}
        <span class="ml-3">Текущий ключ: <code>{{ doc.key }}</code></span>
      </div>
    </VCardText>

    <VCardText v-else>
      Документ не найден
    </VCardText>
  </VCard>
</template>
