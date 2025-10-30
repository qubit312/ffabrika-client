<script setup lang="ts">
import { computed, defineEmits, defineProps, onMounted, reactive, ref, watch } from 'vue';
import { createPrinter, getPrinters, syncPrinterCount, updatePrinter } from '../services/printers';
import type { CreatePrinterDto, Printer } from '../types/printer';

interface Props {
  printer: Printer | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'printer-updated', v: number | null): void;
}>()

const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const dialog = ref(false)
const isEditMode = ref(false)
const editingId = ref<number | null>(null)
const printers = ref<Printer[]>([])

const selectedPrinterId = ref<number | null>(null)
const selectedPrinter = ref<Printer | null>(null)

watch(
  () => props.printer,
  (newPrinter) => {
    if (newPrinter) {
      selectedPrinter.value = { ...newPrinter }
      selectedPrinterId.value = newPrinter.id
    } else {
      selectedPrinter.value = null
      selectedPrinterId.value = null
    }
  },
  { immediate: true }
);

const printerName = computed(() => selectedPrinter.value?.name || '');

const printerCapacity = computed(() => selectedPrinter.value?.capacity || 0);

const printerWarningThreshold = computed(() => selectedPrinter.value?.warning_threshold || 0);

const printerLabelsCount = computed(() => selectedPrinter.value?.labels_count || 0);

async function fetchPrinters() {
  const { data, error } = await getPrinters()
  if (data.value) {
    printers.value = data.value.data
  } else {
    console.error('Ошибка при загрузке принтеров', error.value)
  }
}

async function openDialog(id: number | null, mode: 'edit' | 'add') {
  if (mode === 'add') {
    resetForm()
    dialog.value = true
  }

  if (id) {
    editedPrinter.name = printerName.value
    editedPrinter.labels_count = printerLabelsCount.value
    editedPrinter.capacity = printerCapacity.value
    editedPrinter.warning_threshold = printerWarningThreshold.value
    editingId.value = id
    isEditMode.value = true
    dialog.value = true
    return
  }
}

const editedPrinter = reactive<CreatePrinterDto>({
  name: "",
  capacity: 0,
  labels_count: 1,
  warning_threshold: 1
})

async function submitPrinter() {
  const printer = props.printer
  if (!printer) {
    showSnackbar('Принтер не выбран', false)
    return
  }

  try {
    const payload: CreatePrinterDto = {
      name: editedPrinter.name?.trim() || '',
      capacity: Number(editedPrinter.capacity) || 0,
      labels_count: Number(editedPrinter.labels_count) || 0,
      warning_threshold: Number(editedPrinter.warning_threshold) || 0,
    }

    if (isEditMode.value && editingId.value) {
      await updatePrinter(editingId.value, payload)
      onUpdatePrinter(editingId.value)
      showSnackbar('Успешно сохранено', true)
    } else {
      await createPrinter(payload)
      showSnackbar('Успешно создано', true)
    }
    await fetchPrinters()
    dialog.value = false
  } catch (e: any) {
    console.error('Ошибка сохранения принтера', e)
    const msg = e?.message || 'Произошла ошибка при сохранении'
    showSnackbar(msg, false)
  }
}

function onUpdatePrinter(id: number) {
  emit('printer-updated', id)
}

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isSuccess) {
    snackColor.value = 'success'
  } else {
    snackColor.value = 'error'
  }
}

onMounted(() => {
  fetchPrinters()
})

async function refreshPrinterCount() {
  if (!selectedPrinter.value || !selectedPrinterId.value) {
    showSnackbar("Сначала выберите принтер", false)
    return
  }

  try {
    const { data, error } = await syncPrinterCount(selectedPrinterId.value)

    if (data.value) {
      onUpdatePrinter(selectedPrinterId.value)
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

// const form = reactive<CreatePrinterDto>({
//   name: "",
//   capacity: 0,
//   labels_count: 1,
//   warning_threshold: 1 
// })

function resetForm() {
  editedPrinter.name = ''
  editedPrinter.labels_count = 0
  editedPrinter.capacity = 1
  editedPrinter.warning_threshold = 1
  editingId.value = null
  isEditMode.value = false
}

// async function onUserSelectPrinter(id: number) {
//   try {
    
//     const { data } = await getPrinter(id)
//     emit('update:printer', data)
//     selectedPrinter.value = data.value
//     loadedLabelInPrinterCount.value = data.value.labels_count
//   } catch (e) {
//     console.error('Ошибка при получении принтера', e)
//     showSnackbar('Не удалось получить данные принтера', false)
//   }
// }
</script>

<template>
  <VRow class="mb-4" align="center" no-gutters>
    <VCol cols="auto">
      <VAvatar size="34" color="primary" variant="tonal" class="me-2" rounded>
        <VIcon icon="tabler-printer" size="22" />
      </VAvatar>
    </VCol>

    <VCol cols="6" class="d-flex align-center">
      <VSelect v-model="selectedPrinter" :items="printers" item-title="name" item-value="id" placeholder="Принтер"
        hide-details variant="outlined" style="max-width: 165px" @update:model-value="onUpdatePrinter">
        <template #no-data>
          <div class="d-flex align-center justify-space-between ps-6 pt-1">
            <span class="text-medium-emphasis">Добавить
              <VBtn class="ms-2" icon variant="text" size="small" color="primary" @click="openDialog(null, 'add')">
                <VIcon icon="tabler-plus" />
              </VBtn>
            </span>
          </div>
        </template>
        <template #append-item>
          <div v-if="printers && printers.length > 0">
            <VDivider />
            <div class="d-flex align-center justify-space-between ps-6 pt-1">
              <span class="text-medium-emphasis">Добавить
                <VBtn class="ms-2" icon variant="text" size="small" color="primary" @click="openDialog(null, 'add')">
                  <VIcon icon="tabler-plus" />
                </VBtn>
              </span>
            </div>
          </div>
        </template>
      </VSelect>

      <VBtn icon variant="text" @click="openDialog(selectedPrinterId, 'edit')" :disabled="!selectedPrinterId">
        <VIcon icon="tabler-edit" />
      </VBtn>
    </VCol>

    <VCol cols="4" class="d-flex align-center justify-end">
      <VTextField style="margin-left: 20px" :model-value="printerLabelsCount" readonly class="font-weight-medium text-default" />

      <VTooltip open-delay="400">
        <template #activator="{ props }">
          <VBtn style="margin-right: -30px;" icon variant="text" v-bind="props" @click="refreshPrinterCount"
            :disabled="!selectedPrinterId || (printerLabelsCount == selectedPrinter?.capacity)">
            <VIcon icon="tabler-repeat" />
          </VBtn>
        </template>
        <span>Обновить количество на {{ selectedPrinter?.capacity }}</span>
      </VTooltip>
    </VCol>
  </VRow>

  <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
    {{ snackMessage }}
  </VSnackbar>

  <VDialog v-model="dialog" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        {{ isEditMode ? 'Редактировать принтер' : 'Создать принтер' }}
      </VCardTitle>

      <VCardText class="d-flex flex-column gap-3">
        <AppTextField v-model="editedPrinter.name" label="Название принтера" required />

        <AppTextField v-model.number="editedPrinter.capacity" label="Вместимость" type="number" min="1" />

        <AppTextField v-model.number="editedPrinter.warning_threshold" label="Порог предупреждения" type="number" min="1" />
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn @click="dialog = false">Отмена</VBtn>
        <VBtn color="primary" variant="flat" @click="submitPrinter">
          {{ isEditMode ? 'Сохранить' : 'Создать' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
