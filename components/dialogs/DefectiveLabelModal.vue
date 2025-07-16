<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useLabelEvents } from '../../composables/useLabelBus';
import { markLabelsAsDefective } from '../../services/chz';

interface Props { modelValue: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const isOpen   = ref(props.modelValue)
watch(() => props.modelValue, v => isOpen.value = v)
watch(isOpen, v => emit('update:modelValue', v))
const { onLabelsUpdated } = useLabelEvents()

const labelIds = ref<(string|number)[]>([])
const reason   = ref('')
const loading  = ref(false)
const snackbar = reactive({ show: false, text: '', color: 'success' as 'success'|'error' })

function showSnackbar(message: string, isSuccess: boolean) {
  snackbar.show = true
  snackbar.text = message
  if (isSuccess) {
    snackbar.color = 'success'
  } else {
    snackbar.color = 'error'
  }
}

async function submitDefective() {
  const ids = labelIds.value
    .map(x => typeof x === 'string' ? parseInt(x, 10) : x)
    .filter((n): n is number => !isNaN(n) && n >= 1)

  if (!ids.length) {
    showSnackbar('Введите хотя бы один корректный ID (число ≥ 1)', false)
    return
  }

  if (!reason.value.trim()) {
    showSnackbar('Укажите причину восстановления', false)
    return
  }

  loading.value = true

  try {
    const { data, error } = await markLabelsAsDefective(ids, reason.value)

    if (error.value) {
      showSnackbar(error.value.message || 'Ошибка при запросе', false)
      return
    }

    if (!data.value?.success) {
      showSnackbar(data.value?.message || 'Ничего не изменено', false)
      return
    }

    const okMsg = data.value.message
      ? data.value.message
      : `Восстановлено: ${data.value.data?.length ?? ids.length} шт.`
    showSnackbar(okMsg, true)

    labelIds.value = []
    reason.value = ''
    onLabelsUpdated()
    isOpen.value = false
  } catch (err: any) {
    showSnackbar(err.message || 'Внутренняя ошибка', false)
    console.error('Ошибка восстановления (ids:', ids, '):', err)
  } finally {
    loading.value = false
  }
}


function close() {
  isOpen.value = false
}
</script>

<template>
  <VDialog v-model="isOpen" max-width="500px">
    <VCard>
      <VCardTitle>Бракованная этикетка</VCardTitle>
      <span class="pe-4 ps-4">
        ЧЗ испорчен. Укажите ID на этикетке, чтобы перепечать. 
      </span>

      <VCardText>
        <VCombobox
          v-model="labelIds"
          multiple
          chips
          clearable
          label="ID этикеток"
          placeholder="Введите ID и нажмите Enter"
          outlined
          dense
        />

        <VTextarea
          v-model="reason"
          label="Причина брака"
          auto-grow
          rows="2"
          outlined
          class="mt-4"
        />
      </VCardText>

      <VCardActions>
        <VSpacer/>
        <VBtn @click="close">Отмена</VBtn>
        <VBtn color="error" @click="submitDefective" :disabled="loading">
          <template #default>
            <span v-if="loading">
              <VProgressCircular indeterminate size="20" width="2" class="mr-2"/>
              Отправка…
            </span>
            <span v-else>Подтвердить</span>
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

<style lang="scss">
  .v-card__subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
