<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  attachProductTags,
  createTag,
  deleteTag as deleteTagApi,
  detachProductTags,
  getProductTagIds,
  getTags,
  updateTag as updateTagApi,

  type Tag
} from '~/services/tags';

type ProductLabel = { id: number; name: string; color: string }

const props = defineProps<{ productId: number | null }>()
const emit = defineEmits<{
  (e: 'changed', payload: { applied: ProductLabel[]; appliedIds: number[]; library: ProductLabel[] }): void
}>()

const presetColors = ref<string[]>([
  '#10bcd4','#4caf50','#ff9800','#f44336','#9c27b0',
  '#3f51b5','#009688','#795548','#607d8b','#000000','#ffffff'
])

const library = ref<ProductLabel[]>([])
const appliedIds = ref<number[]>([])

const loading = ref(false)           
const loadingLibrary = ref(false)     
const loadingApplied = ref(false)     

const savingForm = ref(false)
const loadingAttach = ref<Set<number>>(new Set()) 
const loadingDelete = ref<Set<number>>(new Set()) 

const showForm = ref(false)
const form = reactive<{ id: number | null; name: string; color: string; useCustom: boolean }>({
  id: null, name: '', color: presetColors.value[0], useCustom: false,
})

const canEdit = computed(() => !!props.productId && props.productId > 0)

function chipStyle(c: string) { return { '--chip-color': c } as any }
function notifyChange() {
  const dict = new Map(library.value.map(l => [l.id, l]))
  const applied = appliedIds.value.map(id => dict.get(id)).filter(Boolean) as ProductLabel[]
  emit('changed', { applied, appliedIds: [...appliedIds.value], library: [...library.value] })
}
function withIdLoading(store: typeof loadingAttach, id: number, fn: () => Promise<void>) {
  store.value.add(id)
  return fn().catch(e => { throw e }).finally(() => store.value.delete(id))
}

async function fetchLibrary() {
  loadingLibrary.value = true
  try {
    const { data, error } = await getTags()
    if (error.value) throw error.value
    const payload = data.value as any
    const list: Tag[] = Array.isArray(payload) ? payload : (payload?.data ?? [])
    library.value = list.map(t => ({ id: Number(t.id), name: t.name, color: t.color || '#10bcd4' }))
  } finally {
    loadingLibrary.value = false
  }
}

async function fetchApplied() {
  if (!props.productId) { appliedIds.value = []; return }
  loadingApplied.value = true
  try {
    const { data, error } = await getProductTagIds(props.productId)
    if (error.value) throw error.value
    const payload = data.value as any
    const list: Tag[] = Array.isArray(payload) ? payload : (payload?.data ?? [])
    appliedIds.value = [...new Set(list.map(t => Number(t.id)))]
  } finally {
    loadingApplied.value = false
  }
}

async function refreshAll() {
  loading.value = true
  try {
    await Promise.all([fetchLibrary(), fetchApplied()])
    notifyChange()
  } catch (e) {
    console.error('Tag load error', e)
  } finally {
    loading.value = false
  }
}

onMounted(refreshAll)
watch(() => props.productId, refreshAll)

function toggleForm() { if (!form.id) showForm.value = !showForm.value }
function resetForm() { form.id=null; form.name=''; form.color=presetColors.value[0]; form.useCustom=false; showForm.value=false }
function startEdit(l: ProductLabel) {
  form.id = l.id; form.name = l.name; form.color = l.color; form.useCustom = !presetColors.value.includes(l.color)
  showForm.value = true
}
async function saveTag() {
  const name = form.name.trim()
  const color = (form.color || '').trim()
  if (!name || !color) return
  savingForm.value = true
  try {
    if (form.id) await updateTagApi(form.id, { name, type: 'custom', color })
    else         await createTag({ name, type: 'custom', color })
    await fetchLibrary()
    notifyChange()
    resetForm()
  } catch (e) {
    console.error('Save tag error', e)
  } finally {
    savingForm.value = false
  }
}

async function attach(id: number) {
  if (!props.productId) return
  await attachProductTags(props.productId, [id])
}

async function detach(id: number) {
  if (!props.productId) return
  await detachProductTags(props.productId, [id]) 
}

async function toggleApply(id: number) {
  if (!props.productId) return
  const isNowApplied = appliedIds.value.includes(id)
  const prev = [...appliedIds.value]

  appliedIds.value = isNowApplied
    ? appliedIds.value.filter(x => x !== id)
    : [...appliedIds.value, id]

  try {
    await withIdLoading(loadingAttach, id, async () => {
      if (isNowApplied) await detach(id)
      else              await attach(id)
      notifyChange()
    })
  } catch (e) {
    appliedIds.value = prev
    console.error('attach/detach error', e)
  }
}

async function removeTag(id: number) {
  await withIdLoading(loadingDelete, id, async () => {
    if (appliedIds.value.includes(id) && props.productId) {
      const prev = [...appliedIds.value]
      appliedIds.value = appliedIds.value.filter(x => x !== id)
      try {
        await detach(id)
      } catch (e) {
        appliedIds.value = prev 
        throw e
      }
    }

    await deleteTagApi(id)
    await fetchLibrary()
    notifyChange()
    if (form.id === id) resetForm()
  })
}

function isApplied(id: number) { return appliedIds.value.includes(id) }
</script>

<template>
  <VCard class="mt-4">
    <VCardTitle class="text-subtitle-1 pt-4 pb-1 px-4">Применённые теги</VCardTitle>
    <VCardText class="pt-2">
      <div class="d-flex flex-wrap gap-2">
        <template v-if="loadingApplied || loadingLibrary">
          <VChip class="chip-product" variant="outlined" size="small">
            <VProgressCircular indeterminate size="14" width="2" class="mr-2" />
            Загрузка тегов…
          </VChip>
        
        </template>
        <template v-else>
          <template v-if="appliedIds.length">
            <VChip
              v-for="id in appliedIds"
              :key="id"
              class="chip-product"
              variant="outlined"
              size="small"
              :style="chipStyle((library.find(l => l.id===id)?.color) || '#10bcd4')"
            >
              {{ library.find(l => l.id===id)?.name || 'Тег' }}
              <template #append>
                <VBtn
                  variant="text"
                  size="x-small"
                  icon="tabler-x"
                  class="ml-1"
                  :loading="loadingAttach.has(id)"
                  @click.stop="toggleApply(id)"
                />
              </template>
            </VChip>
          </template>
          <div v-else class="text-medium-emphasis">Пока не применено ни одного тега</div>
        </template>
      </div>
    </VCardText>

    <VDivider />

    <VCardTitle class="text-subtitle-1 pt-4 pb-1 px-4 d-flex align-center justify-space-between">
      <span>Библиотека тегов</span>
      <VBtn
        variant="outlined"
        color="primary"
        :prepend-icon="showForm ? (form.id ? 'tabler-edit' : 'tabler-minus') : 'tabler-plus'"
        @click="toggleForm"
      >
        {{ showForm ? 'Скрыть ' : 'Добавить' }}
      </VBtn>
    </VCardTitle>

    <VCardText class="pt-2">
      <div class="d-flex flex-wrap gap-2 mb-4">
        <template v-if="loadingLibrary">
          <VChip
            class="chip-product"
            variant="outlined"
            size="small"
          >
            <VProgressCircular indeterminate size="14" width="2" class="me-2" />
            Загрузка библиотеки…
          </VChip>
        </template>
      
        <template v-else-if="library.length">
          <VChip
            v-for="l in library"
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
                :loading="loadingAttach.has(l.id)"
                @click.stop="toggleApply(l.id)"
              />
              <VBtn
                variant="text"
                size="x-small"
                icon="tabler-edit"
                class="ml-1"
                @click.stop="startEdit(l)"
              />
              <VBtn
                variant="text"
                size="x-small"
                icon="tabler-trash"
                class="ml-1"
                :loading="loadingDelete.has(l.id)"
                @click.stop="removeTag(l.id)"
              />
            </template>
          </VChip>
        </template>
      
        <div v-else class="text-medium-emphasis">В библиотеке пока нет тегов</div>
      </div>

      <VExpandTransition>
        <div v-show="showForm">
          <VForm @submit.prevent="saveTag">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="form.name"
                  label="Название"
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
                      :class="{ selected: !form.useCustom && form.color === c }"
                      :style="{ backgroundColor: c, borderColor: c === '#ffffff' ? '#ccc' : c }"
                      @click="form.useCustom = false; form.color = c"
                    >
                      <VIcon
                        v-if="!form.useCustom && form.color === c"
                        size="16" color="white" class="dot-check"
                      >
                        tabler-check
                      </VIcon>
                    </button>
                  </div>
                  <div class="d-flex align-center gap-3 mt-2">
                    <VSwitch v-model="form.useCustom" label="Произвольный цвет" density="compact" />
                    <input v-if="form.useCustom" type="color" v-model="form.color" class="color-input" />
                    <div class="text-caption">{{ form.color }}</div>
                  </div>
                </div>
              </VCol>

              <VCol cols="12" class="d-flex gap-2">
                <VBtn type="submit" color="primary" :loading="savingForm">
                  {{ form.id ? 'Сохранить' : 'Добавить' }}
                </VBtn>
                <VBtn v-if="form.id || showForm" variant="outlined" color="default" @click="resetForm">
                  Отменить
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </div>
      </VExpandTransition>
    </VCardText>

    <VProgressLinear v-if="loading" indeterminate />
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
.color-dot { position: relative; width: 26px; height: 26px; border-radius: 999px; border: 2px solid transparent; outline: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.color-dot.selected { box-shadow: 0 0 0 3px rgba(0,0,0,0.12), 0 0 0 2px var(--v-theme-primary); border-color: var(--v-theme-primary); }
.dot-check { pointer-events: none; }
.color-input { width: 44px; height: 32px; padding: 0; border: none; background: transparent; cursor: pointer; }
</style>
