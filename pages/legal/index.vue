<script setup lang="ts">
import {
  deleteSystemTextById,
  listSystemTexts,
  type SystemText,
} from '@/services/systemTexts'
import { computed, ref, unref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const { data, pending, refresh, error } = await useAsyncData<SystemText[]>(
  'system-texts',
  () => listSystemTexts(),
  { default: () => [] }
)

const items = computed<SystemText[]>(() => unref(data) ?? [])

const openDoc = (key: string) => router.push(`/legal/${encodeURIComponent(key)}`)
const addNew = () => router.push('/legal/new')

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<SystemText | null>(null)

const askDelete = (item: SystemText) => {
  target.value = item
  confirmOpen.value = true
}

const doDelete = async () => {
  if (!target.value?.id) return
  deleting.value = true
  try {
    await deleteSystemTextById(target.value.id)
    confirmOpen.value = false
    target.value = null
    await refresh()
  } finally {
    deleting.value = false
  }
}

const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const normalized = iso.replace(/\.\d+Z$/, 'Z')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU')
}
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex justify-space-between align-center">
      <span>Юридические документы</span>
      <VBtn color="primary" prepend-icon="tabler-plus" @click="addNew">
        Добавить документ
      </VBtn>
    </VCardTitle>

    <VDivider />

    <VAlert v-if="error" type="error" variant="tonal" class="ma-4">
      Ошибка загрузки списка
    </VAlert>

    <VTable class="text-no-wrap">
      <thead>
        <tr>
          <th style="width:280px">Ключ</th>
          <th>Название</th>
          <th style="width:220px">Обновлён</th>
          <th style="width:180px" class="text-right">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pending">
          <td colspan="4">Загрузка…</td>
        </tr>

        <tr v-for="d in items" :key="d.id ?? d.key">
          <td><code>{{ d.key }}</code></td>
          <td>{{ d.title }}</td>
          <td>{{ fmtDate(d.updated_at) }}</td>
          <td class="text-right">
            <VBtn variant="text" size="small" @click="openDoc(d.key)">Открыть</VBtn>
            <VBtn
              variant="text"
              size="small"
              color="error"
              @click="askDelete(d)"
            >
              Удалить
            </VBtn>
          </td>
        </tr>

        <tr v-if="!pending && !items.length">
          <td colspan="4" class="text-medium-emphasis">Пока нет документов</td>
        </tr>
      </tbody>
    </VTable>
  </VCard>

  <VDialog v-model="confirmOpen" max-width="520" persistent>
    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon icon="tabler-alert-triangle" class="mr-2" color="error" />
        Подтверждение удаления
      </VCardTitle>
      <VDivider />
      <VCardText>
        Удалить документ
        <strong v-if="target">{{ target.title }}</strong>

        ? Это действие необратимо.
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="tonal" @click="confirmOpen = false" :disabled="deleting">Отмена</VBtn>
        <VBtn color="error" :loading="deleting" @click="doDelete">Удалить</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
