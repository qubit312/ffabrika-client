<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, ref, watch } from 'vue';
import { createPrinter, getPrinter, getPrinters, syncPrinterCount, updatePrinter } from '../services/printers';
import type { CreatePrinterDto, Printer } from '../types/printer';

interface Props {
  labelId: number
  printerId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:printerId', v: number | null): void
}>()

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')
const loadedLabelInPrinterCount = ref<number>(0)

const isLowloadedLabelInPrinterCount = computed(() => {
  const warning_threshold = selectedPrinter.value?.warning_threshold
  if (warning_threshold) {
    return loadedLabelInPrinterCount.value < loadedLabelInPrinterCount.value * (1 - warning_threshold)
  }
  return loadedLabelInPrinterCount.value < 0
}
)

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isSuccess) {
    snackColor.value = 'success'
  } else {
    snackColor.value = 'error'
  }
}

const dialog = ref(false)
const isEditMode = ref(false)
const editingId = ref<number | null>(null)
const printers = ref<Printer[]>([])
const selectedPrinter = ref<Printer | null>(null)
const selectedPrinterId = computed({
  get: () => props.printerId,
  set: v => {
    if (v) {
      onPrinterSelect(v)
    }
    emit('update:printerId', v || null)
  },
})

watch(
  () => props.printerId,
  (id: number | null) => {
    if (id) {
      onPrinterSelect(id)
    }
  },
)

const form = ref<CreatePrinterDto>({
  name: '',
  labels_count: 0,
  capacity: 1,
  warning_threshold: 0,
})

async function fetchPrinters() {
  const { data, error } = await getPrinters()
  if (data.value) {
    printers.value = data.value.data
  } else {
    console.error('Ошибка при загрузке принтеров', error.value)
  }
}

async function openDialog(id?: number | null) {
  dialog.value = true
  if (id) {
    const { data, error } = await getPrinter(id);
    const printer = data.value;
    form.value = {
      name: printer.name,
      labels_count: printer.labels_count,
      capacity: printer.capacity,
      warning_threshold: printer.warning_threshold,
    }
    editingId.value = printer.id
    isEditMode.value = true
  } else {
    form.value = {
      name: '',
      labels_count: 0,
      capacity: 1,
      warning_threshold: 0,
    }
  }
}

async function submitPrinter() {
  const dto = { ...form.value }

  if (isEditMode.value && editingId.value) {
    const { data, error } = await updatePrinter(editingId.value, dto)
    if (data.value) {
      selectedPrinter.value = data.value.data
      showSnackbar("Успешно сохранено", true)
    } else {
      console.error(error.value.data)
      const errorMessage = error?.value?.data?.message;
      showSnackbar(!errorMessage ? "Произошла ошибка при сохранении" : errorMessage, false)
      return
    }
  } else {
    const { data, error } = await createPrinter(dto)
    if (data.value) {
      showSnackbar("Успешно сохранено", true)
    } else {
      console.error(error.value.data)
      const errorMessage = error?.value?.data?.message;
      showSnackbar(!errorMessage ? "Произошла ошибка при сохранении" : errorMessage, false)
      return
    }
  }
  fetchPrinters()
  dialog.value = false
}

async function onPrinterSelect(id: number) {
  const { data, error } = await getPrinter(id);
  selectedPrinter.value = data.value
  loadedLabelInPrinterCount.value = data.value.labels_count
}

async function refreshPrinterCount() {
  if (!selectedPrinter.value || !selectedPrinterId.value) {
    showSnackbar("Сначала выберите принтер", false)
    return
  }

  try {
    const { data, error } = await syncPrinterCount(selectedPrinterId.value)

    if (data.value) {
      showSnackbar("Количество этикеток обновлено", true)
      loadedLabelInPrinterCount.value = data.value.labels_count
      await fetchPrinters()
    } else {
      console.error(error.value)
      showSnackbar("Ошибка при обновлении количества", false)
    }
  } catch (err) {
    console.error(err)
    showSnackbar("Ошибка при выполнении запроса", false)
  }
}

onMounted(async () => {
  await fetchPrinters()
})
</script>

<template>
  <VRow class="mb-4" align="center" no-gutters>
    <VCol cols="auto">
      <VAvatar size="34" color="primary" variant="tonal" class="me-2" rounded>
        <VIcon icon="tabler-printer" size="22" />
      </VAvatar>
    </VCol>

    <VCol cols="6" class="d-flex align-center">
      <VSelect v-model="selectedPrinterId" :items="printers" item-title="name" item-value="id" placeholder="Принтер"
        hide-details variant="outlined" style="max-width: 165px" @update:model-value="onPrinterSelect">
        <template #no-data>
          <div class="d-flex align-center justify-space-between ps-4">
            <span class="text-medium-emphasis">Добавить
            <VBtn class="ms-2" icon variant="text" size="small" color="primary" @click="openDialog()">
              <VIcon icon="tabler-plus" />
            </VBtn>
            </span>
          </div>
        </template>
      </VSelect>

      <VBtn icon variant="text" @click="openDialog(selectedPrinterId)" :disabled="!selectedPrinterId">
        <VIcon icon="tabler-edit" />
      </VBtn>
    </VCol>

    <VCol cols="4" class="d-flex align-center justify-end">
      <VTextField style="margin-left: 20px" :model-value="loadedLabelInPrinterCount" readonly :class="[
        'font-weight-medium',
        isLowloadedLabelInPrinterCount ? 'text-error' : 'text-default'
      ]" />

      <VTooltip open-delay="400">
        <template #activator="{ props }">
          <VBtn style="margin-right: -30px;" icon variant="text" v-bind="props" @click="refreshPrinterCount"
            :disabled="!selectedPrinterId || (loadedLabelInPrinterCount == selectedPrinter?.capacity)">
            <VIcon icon="tabler-repeat" />
          </VBtn>
        </template>
        <span>Обновить количество на {{ selectedPrinter?.capacity }}</span>
      </VTooltip>

    </VCol>
  </VRow>
  <template>
    <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
      {{ snackMessage }}
    </VSnackbar>
  </template>

  <VDialog v-model="dialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ isEditMode ? 'Редактировать принтер' : 'Создать принтер' }}
      </VCardTitle>

      <VCardText class="d-flex flex-column gap-3">
        <AppTextField v-model="form.name" label="Название принтера" required />

        <AppTextField v-model.number="form.capacity" label="Вместимость" type="number" min="1" />

        <AppTextField v-model.number="form.warning_threshold" label="Порог предупреждения" type="number" min="0" />
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn text @click="dialog = false">Отмена</VBtn>
        <VBtn color="primary" @click="submitPrinter">
          {{ isEditMode ? 'Сохранить' : 'Создать' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
