<script setup lang="ts">
import { defineProps } from 'vue';

interface Props {
  markingId: string
}

type MarkingVariants = {
  id: string;
  size: string;
  barcode: string;
  markingId: string;
};

const markingVariants: MarkingVariants[] = [
  {
    id: '1',
    size: 'S',
    barcode: '4000000000001',
    markingId: '1'
  },
  {
    id: '2',
    size: 'M',
    barcode: '4000000000002',
    markingId: '2'
  },
  {
    id: '3',
    size: 'L',
    barcode: '4000000000003',
    markingId: '3'
  },
  {
    id: '4',
    size: 'XL',
    barcode: '4000000000004',
    markingId: '4'
  }
];

const props = defineProps<Props>()

const editDialog = ref(false)
const deleteDialog = ref(false)

const defaultItem = ref<MarkingVariants>({
  id: "-1",
  size: '',
  barcode: '',
  markingId: ''
})

const editedItem = ref<MarkingVariants>(defaultItem.value)
const editedIndex = ref(-1)
const userList = ref<MarkingVariants[]>([])

// headers
const headers = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'size', sortable: false },
  { title: '', key: 'actions', sortable: false },
]

// 👉 methods
const editItem = (item: MarkingVariants) => {
  editedIndex.value = userList.value.indexOf(item)
  editedItem.value = { ...item }
  editDialog.value = true
}

const addItem = () => {
  editedIndex.value = -1
  editedItem.value = { id: '', size: '', barcode: '', markingId: props.markingId }
  editDialog.value = true
}

const deleteItem = (item: MarkingVariants) => {
  editedIndex.value = userList.value.indexOf(item)
  editedItem.value = { ...item }
  deleteDialog.value = true
}

const close = () => {
  editDialog.value = false
  editedIndex.value = -1
  editedItem.value = { ...defaultItem.value }
}

const closeDelete = () => {
  deleteDialog.value = false
  editedIndex.value = -1
  editedItem.value = { ...defaultItem.value }
}

const save = () => {
  if (editedIndex.value > -1) {
    Object.assign(userList.value[editedIndex.value], editedItem.value)
  } else {
    editedItem.value.id = Date.now().toString()
    editedItem.value.markingId = props.markingId
    userList.value.push({ ...editedItem.value })
  }

  close()
}

const deleteItemConfirm = () => {
  userList.value.splice(editedIndex.value, 1)
  closeDelete()
}

onMounted(() => {
  userList.value = markingVariants.filter(v => v.markingId === props.markingId)
})

</script>

<template>
  <!-- 👉 Datatable  -->
    <VBtn color="primary" class="mb-4" @click="addItem">
        Добавить вариант
    </VBtn>

  <VDataTable
    :headers="headers"
    :items="userList"
    :items-per-page="5"
  >
    <!-- Actions -->
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <IconBtn @click="editItem(item)">
          <VIcon icon="tabler-edit" />
        </IconBtn>
        <IconBtn @click="deleteItem(item)">
          <VIcon icon="tabler-trash" />
        </IconBtn>
      </div>
    </template>
  </VDataTable>

  <!-- 👉 Edit Dialog  -->
  <VDialog
    v-model="editDialog"
    max-width="600px"
  >
    <VCard>
      <VCardTitle>
        <span class="headline">Редактирование</span>
      </VCardTitle>

      <VCardText>
        <VContainer>
          <VRow>
            <!-- barcode -->
            <VCol
              cols="12"
              sm="6"
              md="6"
            >
              <VTextField
                v-model="editedItem.barcode"
                label="Баркод"
              />
            </VCol>

            <!-- size -->
            <VCol
              cols="12"
              sm="6"
              md="6"
            >
              <VTextField
                v-model="editedItem.size"
                label="Размер"
              />
            </VCol>
          </VRow>
        </VContainer>
      </VCardText>

      <VCardActions>
        <VSpacer />

        <VBtn
          color="error"
          variant="outlined"
          @click="close"
        >
          Закрыть
        </VBtn>

        <VBtn
          color="success"
          variant="elevated"
          @click="save"
        >
          Сохранить
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- 👉 Delete Dialog  -->
  <VDialog
    v-model="deleteDialog"
    max-width="350px"
  >
    <VCard>
        <VCardTitle>
            Подтверждение
        </VCardTitle>
        <VCardText>
            Удалить размер {{editedItem.size}}?
        </VCardText>
        <VCardActions>
            <VSpacer />
            <VBtn
                color="error"
                variant="elevated"
                @click="closeDelete"
                >
                Закрыть
            </VBtn>

            <VBtn
                color="success"
                variant="elevated"
                @click="deleteItemConfirm"
                >
                ОК
            </VBtn>
        </VCardActions>
    </VCard>
  </VDialog>
</template>
