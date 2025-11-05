<script setup lang="ts">
import FileHistoryDialog from '@/components/dialogs/FileHistoryDialog.vue'
import UpdateChzLabel from '@/components/dialogs/UpdateChzLabel.vue'
import { getProductMainImage } from '@/services/productImages'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CustomLoading from '../../../components/CustomLoading.vue'
import PrintCardModule from '../../../components/dialogs/PrintCardModule.vue'
import SizeMappingModal from '../../../components/dialogs/SizeMappingModal.vue'
import PrinterInfo from '../../../components/PrinterInfo.vue'
import { createLabel, getLabel, updateLabel } from '../../../services/labels'
import { getPrinter } from '../../../services/printers'
import type { Label, NewLabelInterface } from '../../../types/label'
import type { Printer } from '../../../types/printer'

const route = useRoute()
const router = useRouter()
const mode = ref<'create' | 'edit' | 'view'>('create')
const entityId = Number(route.params.id as string)

const snackbar = ref<boolean>(false)
const snackMessage = ref<string>('')
const snackColor = ref<'success' | 'error'>('success')

const showFileMappingModal = ref<boolean>(false)
const csvFiles = ref<File[]>([])
const uploadType = ref<'csv' | 'pdf'>('csv')
const pdfFiles = ref<File[]>([])

const dropZoneRef = ref<HTMLDivElement>()
interface FileData { file: File; url: string }
const fileData = ref<FileData[]>([])

const onChange = (cb: (files: File[] | null) => void) => { }
const useDropZone = (_el: any, _fn: any) => { }
const showLabelDialog = ref(false)
const isCreate = computed(() => mode.value === 'create')
const currentTitle = computed(() => form.name)
const productColor = computed(() => form.product?.color || '')
const mainImage = ref<string | null>(null)
const breadcrumbs = computed(() => {
  const hasProduct = !!form.product?.id
  const productName = form.product?.name || 'Товар'

  return [
    {
      title: 'Товары',
      text: 'Товары',
      to: { name: 'product-list' },
    },
    {
      title: productName,
      text: productName,
      to: hasProduct ? { name: 'product-details-id', params: { id: form.product!.id } } : undefined,
      disabled: !hasProduct,
    },
    {
      title: 'Маркировка',
      text: 'Маркировка',
      disabled: true,
    },
  ]
})


function onDrop(files: File[] | null) {
  files?.forEach(file => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }
    fileData.value.push({
      file,
      url: URL.createObjectURL(file)
    })
  })
}

onChange(selected => onDrop(selected))
useDropZone(dropZoneRef, onDrop)

const markingData = ref<Label | null>(null)
const printer = ref<Printer>({
  id: 0,
  name: '',
  capacity: 1,
  labels_count: 0,
  warning_threshold: 0,
  last_synced_at: '',
})

async function onPrinterSelect(id: number) {
  if (id) {
    const { data, error } = await getPrinter(id);
    printer.value = data.value
    form.printer_id = id
  }
}

const form = reactive<NewLabelInterface>({
  id: 0,
  name: '',
  product_id: 0,
  printer_id: null,
  client_name: '',
  brand: '',
  print_single_ean13: false,
  print_double_ean13: false,
  duplicate_chz: false,
  product: null,
  label_template_id: 1,
  size_display_type: 'RUS'
})

watch(
  () => form.printer_id,
  (id: number | null) => {
    if (id) {
      onPrinterSelect(id)
    }
  },
)

function mapLabelResponseToForm(response: any) {
  form.id = response.id ?? 0
  form.name = response.name ?? ''
  form.product_id = response.product_id ?? 0
  form.printer_id = response.printer_id ?? null
  form.client_name = response.client_name ?? ''
  form.print_single_ean13 = !!response.print_single_ean13
  form.print_double_ean13 = !!response.print_double_ean13
  form.duplicate_chz = !!response.duplicate_chz
  form.product = response.product ?? null
  form.label_template_id = response.label_template_id ?? 1
  form.size_display_type = response.size_display_type ?? ''
}

const showDefectiveModal = ref(false)
const fetchLabel = async (id: number) => {
  if (id <= 0) {
    mode.value = 'create'
    loading.value = false
    return
  }

  try {
    const { data, error } = await getLabel(id)
    if (error.value) {
      console.error('Ошибка при получении метки:', error.value)
      loading.value = false
      return
    }

    markingData.value = data.value || null
    if (markingData.value) {
      mapLabelResponseToForm(data.value)
      mode.value = 'edit'
    }
    loading.value = false
  } catch (e) {
    console.error('Непредвиденная ошибка:', e)
    loading.value = false
  }
}


async function onSubmit() {
  loading.value = true
  const payload = {
    name: form.name,
    product_id: form.product_id ?? null,
    client_name: form.client_name,
    printer_id: form.printer_id,
    print_single_ean13: form.print_single_ean13,
    print_double_ean13: form.print_double_ean13,
    duplicate_chz: form.duplicate_chz,
    label_template_id: form.label_template_id,
    size_display_type: form.size_display_type
  }
  
  try {
    let labelId: number = 0

    if (mode.value === 'edit' && markingData.value) {
      const { data, error } = await updateLabel(entityId, payload)
      if (error.value) throw error.value
      mapLabelResponseToForm(data.value.data)
    } else {
      const { data, error } = await createLabel(payload)
      if (error.value) throw error.value
      labelId = data.value.id
    }

    if (mode.value === 'create' && labelId) {
      await router.push({
        name: 'product-marking-id',
        params: { id: labelId }
      })
    }
    
  } catch (err: any) {
    console.error(err)
    showSnackbar('Ошибка при сохранении: ' + (err.message || err), true)
    return false
  }
  loading.value = false
  return true
}

function showSnackbar(message: string, isError: boolean) {
  snackbar.value = true
  snackMessage.value = message
  if (isError) {
    snackColor.value = 'error'
  } else {
    snackColor.value = 'success'
  }
}

onMounted(async () => {
  loading.value = true
  if (entityId > 0) {
    await fetchLabel(entityId)
    const { data, error } = await getProductMainImage(entityId)
    if (!error.value && data.value?.data) {
      mainImage.value = data.value.data.url
    }
  }
  
  loading.value = false
})

function openDefective() {
  showDefectiveModal.value = true
}

watch(uploadType, () => { 
  csvFiles.value = []
  pdfFiles.value = []
})


const loading = ref(false)

const onPrinterUpdated = (id: number | null) => {
  if (id) {
    onPrinterSelect(id)
  }
};

function handleDownloadStarted(callback: (result: boolean) => void) {
  onSubmit().then(isSaved => {
    callback(isSaved)
  })
}

const onFileChange = (files: File[]) => {
  if (!files) {
    allFiles.value = []
    return
  }

  const isValid = validateFiles(files)
  if (!isValid) {
    if (uploadType.value === 'csv') csvFiles.value = []
    else pdfFiles.value = []
    return
  }

  allFiles.value = files
}

watch(csvFiles, () => { 
  onFileChange(csvFiles.value)
})

watch(pdfFiles, () => { 
  onFileChange(pdfFiles.value)
})

const allFiles = ref<File[]>([])
const maxSizeDialogVisible = ref(false)
const maxSizeDialogForm = reactive({ message: '' })
const showHistory = ref(false)

const MAX_FILE_SIZE_MB = 20
const MAX_TOTAL_SIZE_MB = 100
const MAX_FILE_COUNT = 10

const validateFiles = (files: File[]) => {
  if (!files || files.length === 0) return true

  if (files.length > MAX_FILE_COUNT) {
    maxSizeDialogForm.message = `Можно загрузить не более ${MAX_FILE_COUNT} файлов.`
    maxSizeDialogVisible.value = true
    return false
  }

  const totalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0)
  const tooBigFiles = Array.from(files).filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)

  if (tooBigFiles.length > 0) {
    const names = tooBigFiles.map(f => f.name).join(', ')
    maxSizeDialogForm.message = `Следующие файлы превышают ${MAX_FILE_SIZE_MB} МБ: ${names}`
    maxSizeDialogVisible.value = true
    return false
  }

  if (totalSize > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
    maxSizeDialogForm.message = `Общий размер файлов не должен превышать ${MAX_TOTAL_SIZE_MB} МБ.`
    maxSizeDialogVisible.value = true
    return false
  }

  return true
}

watch(uploadType, () => {
  allFiles.value = []
})

function openSizeMappingModal() {
  console.log(allFiles)
  if (allFiles.value.length === 0) {
    maxSizeDialogForm.message = 'Пожалуйста, загрузите хотя бы один файл.'
    maxSizeDialogVisible.value = true
    return
  }

  showFileMappingModal.value = true
}

</script>

<template>
  <div>
   <AppBreadcrumbs :items="breadcrumbs" class="mb-2" />
    <div class="d-flex flex-wrap justify-start justify-sm-space-between gap-y-4 gap-x-6 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 font-weight-medium">
          {{
            mode === 'create'
              ? 'Вы создаете новую этикетку'
              : form.name
          }}
        </h4>
      </div>

      <div class="d-flex gap-4 align-center flex-wrap">
        <VBtn variant="tonal" color="secondary" @click="router.back()">Закрыть</VBtn>
        <VBtn color="primary" @click="onSubmit">Сохранить </VBtn>

      </div>
    </div>

    <VRow>
      <VCol md="3">
        <VCard
          class="d-flex flex-column align-center justify-center"
          style="height: 430px; width: 100%; overflow: hidden;"
        >
          <div v-if="mainImage" style="width: 100%;">
            <img 
              :src="mainImage" 
              alt="Фото товара" 
              style="width: 100%; height: auto; object-fit: contain;" 
            />
          </div>

          <div v-else class="d-flex flex-column align-center justify-center" style="height: 100%;">
            <VIcon size="40" color="grey">tabler-files</VIcon>
            <div class="text-h6 mt-2" style="color: grey;">
              Место под фотографию
            </div>
          </div>
        </VCard>
      </VCol>
      <VCol md="9">
        <VCard style="min-height: 430px;">
          <VCardText>
            <VRow class="mb-4">
              <VCol cols="12" md="6">
                <div class="d-flex align-center" style="gap: 8px">
                  <AppAutocomplete v-model="form.product" item-title="name" item-value="id"
                    searchable readonly return-object label="Товар" placeholder="Выберите товар" class="flex-grow-1" />
                  <VBtn class="mt-6" v-if="form.product"
                    :to="{ name: 'product-details-id', params: { id: form.product.id } }" icon variant="text"
                    color="primary">
                    <VIcon>tabler-edit</VIcon>
                    <VTooltip activator="parent" location="top">Перейти к товару</VTooltip>
                  </VBtn>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <VLabel
                    class="mb-1 text-body-2"
                    text="Цвет"
                  />
                  <AppTextField
                    class="flex-grow-1"
                    variant="plain"
                    readonly
                    v-model="productColor"
                  />
              </VCol>              
            </VRow>

            <LabelVariantDetails 
              v-if="form" :product="markingData?.product" 
              :name="form.name" :label="form" parentComponent="marking" 
              :printer="printer" @printer-updated="onPrinterUpdated"
              @download-started="handleDownloadStarted"
            />
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="8">
        <PrintCardModule
          :labelId="entityId"
          v-model="form"
        />
      </VCol>

      <VCol md="4" cols="12">
        <VCard class="mb-6" title="Принтер">
          <VCardText>
            <PrinterInfo :printer="printer" @printer-updated="onPrinterUpdated"/>
          </VCardText>
        </VCard>

        <VCard>
          <VCardTitle class="ms-2 mt-2">
            <div class="d-flex justify-space-between align-center w-100">
              <span>Честный знак</span>
              
              <div>

                <VTooltip open-delay="600">
                  <template #activator="{ props }">
                    <IconBtn v-bind="props" @click="showLabelDialog = true"  >
                      <VIcon icon="tabler-arrows-shuffle" />
                    </IconBtn>
                  </template>
                  <span>Перенести на другой товар</span>
                </VTooltip>
                <VTooltip>
                  <template #activator="{ props }">
                    <IconBtn @click="showHistory = true" v-bind="props">
                      <VIcon icon="tabler-file-time" />
                    </IconBtn>
                  </template>
                  <span>История загрузок</span>
                </VTooltip>
                
                <VMenu>
                  <template #activator="{ props }">
                    <IconBtn v-bind="props">
                      <VIcon icon="tabler-dots-vertical" />
                    </IconBtn>
                  </template>

                  <VList>
                    <VListItem @click="openDefective">
                      <VListItemTitle>Бракованная этикетка</VListItemTitle>
                    </VListItem>
                  </VList>
                </VMenu>
              </div>

              
            </div>
          </VCardTitle>

          <div class="d-flex flex-column">
            <VCardText class="pt-2">
              <div class="mb-2 d-flex align-center gap-2">
                <span class="text-body-2">
                  Выберите тип документа для загрузки ЧЗ и прикрепите файлы.
                </span>
              </div>

              <!-- Выбор типа -->
              <div class="mb-4">
                <VBtn
                  class="me-1 pe-2 ps-2"
                  value="asc"
                  size="small"
                  :color="uploadType === 'csv' ? 'primary' : undefined"
                  :variant="uploadType === 'csv' ? 'flat' : 'outlined'"
                  @click="uploadType = 'csv'"
                >
                  <VIcon icon="tabler-file-spreadsheet" />
                  CSV
                </VBtn>

                <VBtn
                  class="pe-2 ps-2"
                  value="desc"
                  size="small"
                  :color="uploadType === 'pdf' ? 'primary' : undefined"
                  :variant="uploadType === 'pdf' ? 'flat' : 'outlined'"
                  @click="uploadType = 'pdf'"
                >
                  <VIcon icon="tabler-file-text" />
                  PDF
                </VBtn>
              </div>

              <!-- Загрузка CSV -->
              <VFileInput
                v-if="uploadType === 'csv'"
                accept=".csv,text/csv"
                label="Загрузить CSV файл"
                multiple
                v-model="csvFiles"
              />

              <!-- Загрузка PDF -->
              <VFileInput
                v-else
                accept=".pdf,application/pdf"
                label="Загрузить PDF файл"
                multiple
                v-model="pdfFiles"
              />

              <VRow class="mt-4">
                <VCol cols="12" class="d-flex justify-end">
                  <VBtn
                    color="primary"
                    :disabled="csvFiles.length === 0 && pdfFiles.length === 0"
                    @click="openSizeMappingModal"
                  >
                    Настроить соответствие размеров
                  </VBtn>
                </VCol>
              </VRow>
            </VCardText>

            <FileHistoryDialog v-model="showHistory" />
          </div>
        </VCard>
      </VCol>
    </VRow>
  </div>

  <VSnackbar v-model="snackbar" :timeout="3000" :color="snackColor" location="top right">
    {{ snackMessage }}
  </VSnackbar>

  <SizeMappingModal v-model="showFileMappingModal" :productId="markingData ? markingData.product_id ? markingData.product_id : 0 : 0" :files="allFiles" :type="uploadType" />

  <VDialog v-model="maxSizeDialogVisible" max-width="500">
    <VCard>
      <VCardTitle class="text-h6">
        Предупреждение
      </VCardTitle>
      <VDivider />
      <VCardText>
        <span>
          {{ maxSizeDialogForm.message }}
        </span>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn variant="flat" @click="maxSizeDialogVisible = false">Закрыть</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <CustomLoading :loading="loading" />
  <UpdateChzLabel
    v-if="markingData?.product"
    v-model="showLabelDialog"
    :product="markingData.product"
  />

</template>

<style lang="scss" scoped></style>
