<script setup lang="ts">
import PrintLabelDialog from '@/components/dialogs/PrintLabelDialog.vue';
import type { ShortEntityParams } from '@db/apps/marking/types';
import { defineProps, onMounted, ref } from 'vue';

interface Props {
  markingId: string
  name: string
  article: string
  composition: string
  color: string
  size: string
  client: ShortEntityParams | null
}

type MarkingVariants = {
  id: string;
  size: string;
  barcode: string;
  printableLabelCount: number,
  markingId: string;
};

const props = defineProps<Props>();

const markingVariants: MarkingVariants[] = [
  { id: '1', size: 'S', barcode: '4000000000001', printableLabelCount: 21,  markingId: '1' },
  { id: '2', size: 'M', barcode: '4000000000002', printableLabelCount: 12, markingId: '2' },
  { id: '3', size: 'L', barcode: '4000000000003', printableLabelCount: 43, markingId: '3' },
  { id: '4', size: 'XL', barcode: '4000000000004', printableLabelCount: 3, markingId: '4' },
];

const isDialogVisible = ref(false);
let currentItem = ref<MarkingVariants | null>(null);

const editDialog = ref(false);
const deleteDialog = ref(false);
const defaultItem = ref<MarkingVariants>({ id: '-1', size: '', printableLabelCount: 0, barcode: '', markingId: '' });
const editedItem = ref<MarkingVariants>(defaultItem.value);
const editedIndex = ref(-1);
const userList = ref<MarkingVariants[]>([]);

const headers = [
  { title: 'Баркод', key: 'barcode', sortable: false },
  { title: 'Размер', key: 'size', sortable: false },
  { title: 'Кол-во Честных знаков', key: 'printableLabelCount', sortable: false },
  { title: '', key: 'actions', sortable: false },
];

const editItem = (item: MarkingVariants) => {
  editedIndex.value = userList.value.indexOf(item);
  editedItem.value = { ...item };
  editDialog.value = true;
};

const addItem = () => {
  editedIndex.value = -1;
  editedItem.value = { id: '', size: '', barcode: '', printableLabelCount: 0, markingId: props.markingId };
  editDialog.value = true;
};

const deleteItem = (item: MarkingVariants) => {
  editedIndex.value = userList.value.indexOf(item);
  editedItem.value = { ...item };
  deleteDialog.value = true;
};

const openPrintDialog = (item: MarkingVariants) => {
  currentItem.value = item;
  isDialogVisible.value = true;
};

const closeEdit = () => {
  editDialog.value = false;
  editedIndex.value = -1;
};

const closeDelete = () => {
  deleteDialog.value = false;
  editedIndex.value = -1;
};

const save = () => {
  if (editedIndex.value > -1) {
    Object.assign(userList.value[editedIndex.value], editedItem.value);
  } else {
    editedItem.value.id = Date.now().toString();
    editedItem.value.markingId = props.markingId;
    userList.value.push({ ...editedItem.value });
  }
  closeEdit();
};

const deleteItemConfirm = () => {
  userList.value.splice(editedIndex.value, 1);
  closeDelete();
};

onMounted(() => {
  userList.value = markingVariants.filter(v => v.markingId === props.markingId);
});
</script>

<template>
  <VBtn color="primary" class="mb-4" @click="addItem">
      Добавить вариант
  </VBtn>

  <VDataTable
    :headers="headers"
    :items="userList"
    :items-per-page="5"
  >
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <IconBtn @click="editItem(item)">
          <VIcon icon="tabler-edit" />
        </IconBtn>
        <IconBtn @click="deleteItem(item)">
          <VIcon icon="tabler-trash" />
        </IconBtn>
        <IconBtn @click="openPrintDialog(item)">
          <VIcon icon="tabler-printer" />
        </IconBtn>
      </div>
    </template>
  </VDataTable>

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
          @click="closeEdit"
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
  <PrintLabelDialog
    v-model:visible="isDialogVisible"
    :name="currentItem?.id ?? ''"
    :article="currentItem?.barcode ?? ''"
    :composition="composition ?? ''"
    :color="color ?? ''"
    :size="currentItem?.size ?? ''"
    :client="client ?? null"
    :printableLabelCount="currentItem?.printableLabelCount ?? 0"
  />
</template>
