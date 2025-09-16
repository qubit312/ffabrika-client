<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

type ProductLabel = { id: string; name: string; color: string }

const props = defineProps<{
  productId?: number | null
}>()

const emit = defineEmits<{
  (e: 'changed', payload: { applied: ProductLabel[]; appliedIds: string[]; library: ProductLabel[] }): void
}>()

const presetColors = ref<string[]>([
  '#10bcd4','#4caf50','#ff9800','#f44336','#9c27b0',
  '#3f51b5','#009688','#795548','#607d8b','#000000','#ffffff'
])

const libraryLabels = ref<ProductLabel[]>([])     
const appliedLabelIds = ref<string[]>([])         

const labelForm = reactive<{ id: string | null; name: string; color: string; useCustom: boolean }>({
  id: null, name: '', color: presetColors.value[0], useCustom: false
})
const labelSaving = ref(false)
const showCreateForm = ref(false)

const LS_KEY_LIBRARY = 'labels:library'
const productKey = computed(() => {
  const pid = props.productId && props.productId > 0 ? props.productId : 'new'
  return `product:${pid}:labelsApplied`
})

function loadLibrary() {
  try { libraryLabels.value = JSON.parse(localStorage.getItem(LS_KEY_LIBRARY) || '[]') }
  catch { libraryLabels.value = [] }
}
function persistLibrary() {
  localStorage.setItem(LS_KEY_LIBRARY, JSON.stringify(libraryLabels.value))
}
function loadApplied() {
  try { appliedLabelIds.value = JSON.parse(localStorage.getItem(productKey.value) || '[]') }
  catch { appliedLabelIds.value = [] }
}
function persistApplied() {
  localStorage.setItem(productKey.value, JSON.stringify(appliedLabelIds.value))
}

function migrateOldPerProduct() {
  const OLD = `product:${props.productId && props.productId > 0 ? props.productId : 'new'}:labels`
  try {
    const raw = localStorage.getItem(OLD)
    if (!raw) return
    const old: ProductLabel[] = JSON.parse(raw)
    if (Array.isArray(old) && old.length) {
      const existingIds = new Set(libraryLabels.value.map(l => l.id))
      const toAdd = old.filter(l => !existingIds.has(l.id))
      if (toAdd.length) {
        libraryLabels.value = [...libraryLabels.value, ...toAdd]
        persistLibrary()
      }
      const ids = old.map(l => l.id)
      const s = new Set([...(appliedLabelIds.value || []), ...ids])
      appliedLabelIds.value = [...s]
      persistApplied()
    }
    localStorage.removeItem(OLD)
  } catch {}
}

function toggleCreateForm() {
  if (labelForm.id) return 
  showCreateForm.value = !showCreateForm.value
}
function resetLabelForm() {
  labelForm.id = null
  labelForm.name = ''
  labelForm.color = presetColors.value[0]
  labelForm.useCustom = false
  showCreateForm.value = false
}
function startEditLabel(l: ProductLabel) {
  labelForm.id = l.id
  labelForm.name = l.name
  labelForm.color = l.color
  labelForm.useCustom = !presetColors.value.includes(l.color)
  showCreateForm.value = true
}

function addOrUpdateLabel() {
  const name = labelForm.name.trim()
  const color = (labelForm.color || '').trim()
  if (!name || !color) return

  labelSaving.value = true
  const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  if (labelForm.id) {
    libraryLabels.value = libraryLabels.value.map(l => l.id === labelForm.id ? { ...l, name, color } : l)
  } else {
    libraryLabels.value.push({ id: makeId(), name, color })
  }
  persistLibrary()
  labelSaving.value = false
  resetLabelForm()
}

function deleteLabel(id: string) {
  libraryLabels.value = libraryLabels.value.filter(l => l.id !== id)
  persistLibrary()
  if (appliedLabelIds.value.includes(id)) {
    appliedLabelIds.value = appliedLabelIds.value.filter(x => x !== id)
    persistApplied()
    notifyChange()
  }
  if (labelForm.id === id) resetLabelForm()
}

function toggleApply(id: string) {
  const set = new Set(appliedLabelIds.value)
  if (set.has(id)) set.delete(id); else set.add(id)
  appliedLabelIds.value = [...set]
  persistApplied()
  notifyChange()
}
function isApplied(id: string) {
  return appliedLabelIds.value.includes(id)
}

function chipStyle(c: string) {
  return { '--chip-color': c } as any
}

function notifyChange() {
  const dict = new Map(libraryLabels.value.map(l => [l.id, l]))
  const applied = appliedLabelIds.value.map(id => dict.get(id)).filter(Boolean) as ProductLabel[]
  emit('changed', { applied, appliedIds: [...appliedLabelIds.value], library: [...libraryLabels.value] })
}

onMounted(() => {
  loadLibrary()
  loadApplied()
  migrateOldPerProduct()
  notifyChange()
})
watch(productKey, () => {
  loadApplied()
  notifyChange()
})
</script>

<template>
  <VCard class="mt-4">
    <VCardTitle class="text-subtitle-1 pt-4 pb-1 px-4">Применённые ярлыки</VCardTitle>
    <VCardText class="pt-2">
      <div class="d-flex flex-wrap gap-2">
        <template v-if="appliedLabelIds.length">
          <VChip
            v-for="id in appliedLabelIds"
            :key="id"
            class="chip-product"
            variant="outlined"
            size="small"
            :style="chipStyle((libraryLabels.find(l => l.id===id)?.color) || '#10bcd4')"
          >
            {{ libraryLabels.find(l => l.id===id)?.name || 'Ярлык' }}
            <template #append>
              <VBtn
                variant="text"
                size="x-small"
                icon="tabler-x"
                class="ml-1"
                @click.stop="toggleApply(id)"
              />
            </template>
          </VChip>
        </template>
        <div v-else class="text-medium-emphasis">Пока не применено ни одного ярлыка</div>
      </div>
    </VCardText>

    <VDivider />

    <VCardTitle class="text-subtitle-1 pt-4 pb-1 px-4 d-flex align-center justify-space-between">
      <span>Библиотека ярлыков</span>
      <VBtn
        variant="outlined"
        color="primary"
        :prepend-icon="showCreateForm ? (labelForm.id ? 'tabler-edit' : 'tabler-minus') : 'tabler-plus'"
        @click="toggleCreateForm"
      >
        {{ showCreateForm ? 'Скрыть ' : 'Добавить' }}
      </VBtn>
    </VCardTitle>

    <VCardText class="pt-2">
      <div class="d-flex flex-wrap gap-2 mb-4">
        <template v-if="libraryLabels.length">
          <VChip
            v-for="l in libraryLabels"
            :key="l.id"
            class="chip-product"
            variant="outlined"
            size="small"
            :style="chipStyle(l.color)"
            :color="isApplied(l.id) ? 'primary' : undefined"
          >
            {{ l.name }}
            <template #append>
              <VBtn
                :icon="isApplied(l.id) ? 'tabler-check' : 'tabler-plus'"
                variant="text"
                size="x-small"
                class="ml-1"
                @click.stop="toggleApply(l.id)"
              />
              <VBtn
                variant="text"
                size="x-small"
                icon="tabler-edit"
                class="ml-1"
                @click.stop="startEditLabel(l)"
              />
              <VBtn
                variant="text"
                size="x-small"
                icon="tabler-trash"
                class="ml-1"
                @click.stop="deleteLabel(l.id)"
              />
            </template>
          </VChip>
        </template>
        <div v-else class="text-medium-emphasis">В библиотеке пока нет ярлыков</div>
      </div>

      <VExpandTransition>
        <div v-show="showCreateForm">
          <VForm @submit.prevent="addOrUpdateLabel">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="labelForm.name"
                  label="Название ярлыка"
                  placeholder="Например: Хит, Новинка, Premium"
                  outlined density="comfortable"
                />
              </VCol>

              <VCol cols="12">
                <div class="d-flex flex-column gap-2">
                  <div class="text-caption mb-1">Цвет</div>
                  <div class="d-flex flex-wrap gap-2">
                    <button
                      v-for="c in presetColors"
                      :key="c"
                      type="button"
                      class="color-dot"
                      :class="{ selected: !labelForm.useCustom && labelForm.color === c }"
                      :style="{ backgroundColor: c, borderColor: c === '#ffffff' ? '#ccc' : c }"
                      @click="labelForm.useCustom = false; labelForm.color = c"
                    >
                      <VIcon
                        v-if="!labelForm.useCustom && labelForm.color === c"
                        size="16"
                        color="white"
                        class="dot-check"
                      >
                        tabler-check
                      </VIcon>
                    </button>
                  </div>
                  <div class="d-flex align-center gap-3 mt-2">
                    <VSwitch v-model="labelForm.useCustom" label="Произвольный цвет" density="compact" />
                    <input
                      v-if="labelForm.useCustom"
                      type="color"
                      v-model="labelForm.color"
                      class="color-input"
                    />
                    <div class="text-caption">{{ labelForm.color }}</div>
                  </div>
                </div>
              </VCol>

              <VCol cols="12" class="d-flex gap-2">
                <VBtn type="submit" color="primary" :loading="labelSaving">
                  {{ labelForm.id ? 'Сохранить' : 'Добавить' }}
                </VBtn>
                <VBtn
                  v-if="labelForm.id || showCreateForm"
                  variant="outlined"
                  color="default"
                  @click="resetLabelForm"
                >
                  Отменить
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </div>
      </VExpandTransition>
    </VCardText>
  </VCard>
</template>

<style scoped>
.chip-product { 
  --chip-color: #10bcd4; 
  border-color: var(--chip-color) !important;
  color: var(--chip-color) !important;
  background-color: transparent !important;
  font-weight: 600;
  border-radius: 5px !important; 
  padding-inline: 14px !important;
  height: 32px !important;
  line-height: 32px !important;
  font-size: 14px !important;
}
.color-dot {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid transparent;
  outline: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.color-dot.selected {
  box-shadow: 0 0 0 3px rgba(0,0,0,0.12), 0 0 0 2px var(--v-theme-primary);
  border-color: var(--v-theme-primary);
}
.dot-check {
  pointer-events: none;
}
.color-input {
  width: 44px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
</style>
