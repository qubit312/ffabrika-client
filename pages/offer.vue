<script setup lang="ts">
import { getSystemText, type SystemText } from '@/services/systemTexts'

definePageMeta({ layout: 'blank', public: true })

const { data, pending, error } = await useAsyncData<SystemText | null>(
  'offer-oferta',
  async () => {
    try {
      return await getSystemText('oferta')
    } catch {
      return null
    }
  },
  { default: () => null }
)

const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const normalized = iso.replace(/\.\d+Z$/, 'Z')
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU')
}
</script>

<template>
  <VContainer class="py-8" style="max-width: 960px;">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-3">
          <NuxtLink to="/" class="text-none">
            <VBtn icon="tabler-arrow-left" variant="text" />
          </NuxtLink>
          <span>{{ data.title }}</span>
        </div>


      </VCardTitle>

      <VDivider />

      <VCardText v-if="pending">Загрузка…</VCardText>

      <VAlert v-else-if="error || !data" type="warning" variant="tonal" class="ma-4">
        Документ с ключом <code>oferta</code> не найден.
      </VAlert>

      <VCardText v-else>
        <div class="text-medium-emphasis mb-4">
          Обновлено: {{ fmtDate(data.updated_at) }}
        </div>

        <div v-html="data.content"></div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<style scoped>
@media print {
  .v-btn, .v-card-title .v-btn, .v-card-title a { display: none !important; }
  .v-container { padding: 0 !important; }
}
</style>
