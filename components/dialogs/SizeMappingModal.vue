<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useLabelEvents } from '../../composables/useLabelBus'
import { importChestnyZnakLabels } from '../../services/chz'
import { getProductSizes } from '../../services/productSizes'


interface Props {
  modelValue: boolean
  files: File[]
  productId: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, v => (isOpen.value = v))
watch(isOpen, v => emit('update:modelValue', v))
const { onLabelsUpdated } = useLabelEvents()
const localMap = ref<Record<number, string>>({})
const sizeOptions = ref<{ label: string; value: string }[]>([])
const loading = ref(false)

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success' as 'success' | 'error'
})

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.show = true
  snackbar.text = message
  if (isSuccess) {
    snackbar.color = 'success'
  } else {
    snackbar.color = 'error'
  }
}

watch(
  () => [isOpen.value, props.productId],
  ([open]) => {
    if (open) fetchSizes()
  }
)

const isFormValid = computed(() =>
  props.files.length > 0
    ? props.files.every((_, idx) => !!localMap.value[idx])
    : false
)

function close() {
  isOpen.value = false
}

async function fetchSizes() {
  loading.value = true
  try {
    const { data, error } = await getProductSizes(props.productId)

    if (error.value) {
      console.error('Ошибка загрузки размеров:', error.value)
      sizeOptions.value = []
      return
    }

    sizeOptions.value = data.value.data.map(ps => ({
      value: String(ps.id),
      label: ps.value,
    }))
  } catch (e) {
    console.error('Непредвиденная ошибка при загрузке размеров:', e)
    sizeOptions.value = []
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!isFormValid.value) return

  const formData = new FormData()
  props.files.forEach((file, idx) => {
    formData.append('file[]', file)
    formData.append('size_id[]', localMap.value[idx])
  })

  loading.value = true
  try {
    const { data, error } = await importChestnyZnakLabels(formData)

    if (error.value) {
      throw new Error(error.value)
    }

    const createdCount = data.value.created?.length ?? 0
    const errorsObj = data.value.errors as Record<string, { code: string[] }>
    const errorFiles = errorsObj ? Object.keys(errorsObj) : []

    if (errorFiles.length > 0) {
      showSnackbar(
        `Импорт завершён: добавлено ${createdCount}, ошибки в ${errorFiles.length} файлах`,
        false
      )
      errorFiles.forEach(fileName => {
        const errorCount = Object.keys(errorsObj[fileName]).length
        console.log(`Ошибка в файле ${fileName}, число ошибок: ${errorCount}`)
      })
    } else {
      showSnackbar(`Добавлено ${createdCount} ЧЗ`, true)
      close()
    }

    onLabelsUpdated()
  } catch (err: any) {
    console.error('Ошибка при импорте:', err)
    showSnackbar(`Произошла ошибка при импорте`, false)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <VDialog v-model="isOpen" max-width="700px">
    <VCard>
      <VCardTitle>Соответствие размеров</VCardTitle>
      <VCardText>
        <div v-if="loading && sizeOptions.length === 0" class="text-center pa-6">
          <VProgressCircular indeterminate size="40" width="4" />
          <div class="mt-2">Загрузка размеров…</div>
        </div>

        <div v-else>
          <VRow
            v-for="(file, idx) in props.files"
            :key="idx"
            class="mb-4 align-center"
          >
            <VCol cols="6">
              {{ file.name }}
            </VCol>
            <VCol cols="6">
              <AppSelect
                v-model="localMap[idx]"
                :items="sizeOptions"
                item-title="label"
                item-value="value"
                placeholder="Выберите размер"
                clearable
                outlined
                :rules="[v => !!v || 'Обязательное поле']"
              />
            </VCol>
          </VRow>
          <div v-if="sizeOptions.length === 0" class="text-caption text-center">
            Для этого товара нет доступных размеров.
          </div>
        </div>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn @click="close">Отмена</VBtn>

        <VBtn
          color="primary"
          @click="onSave"
          :disabled="loading || !isFormValid"
        >
          <template #default>
            <span v-if="loading">
              <VProgressCircular
                indeterminate
                size="20"
                width="2"
                class="mr-2"
              />
              Сохранение...
            </span>
            <span v-else>Сохранить</span>
          </template>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    timeout="3000"
    location="top right"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>
