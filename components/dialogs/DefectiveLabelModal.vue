<script setup lang="ts">
import { reactive, ref, watch } from 'vue';

interface Props { modelValue: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'defective-submitted'): void
}>()

const token = ref<string>(localStorage.getItem('access_token'))
const isOpen   = ref(props.modelValue)
watch(() => props.modelValue, v => isOpen.value = v)
watch(isOpen, v => emit('update:modelValue', v))

const labelIds = ref<(string|number)[]>([])
const reason   = ref('')
const loading  = ref(false)

const snackbar = reactive({ show: false, text: '', color: 'success' as 'success'|'error' })
function showNotification(text: string, color: 'success'|'error' = 'success') {
  snackbar.text  = text
  snackbar.color = color
  snackbar.show  = true
}

async function submitDefective() {
  const ids = labelIds.value
    .map(x => typeof x === 'string' ? parseInt(x, 10) : x)
    .filter((n): n is number => !isNaN(n) && n >= 1);

  if (!ids.length) {
    showNotification('Введите хотя бы один корректный ID (число ≥ 1)', 'error');
    return;
  }
  if (!reason.value.trim()) {
    showNotification('Укажите причину восстановления', 'error');
    return;
  }

  loading.value = true;
  try {
    const payload = { ids, reason: reason.value };
    const response = await fetch('http://127.0.0.1:8000/api/chestny-znak-labels/defective', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      const msg = json.message || `Ошибка ${response.status}`;
      showNotification(msg, 'error');
      return;
    }

    if (!json.success) {
      showNotification(json.message || 'Ничего не изменено', 'error');
      return;
    }

    const okMsg = json.message
      ? json.message
      : `Восстановлено: ${json.data?.length ?? ids.length} шт.`;
    showNotification(okMsg, 'success');

    labelIds.value = [];
    reason.value   = '';

    emit('defective-submitted');
    isOpen.value = false;
  } catch (err: any) {
    const msg = err.message || 'Внутренняя ошибка';
    showNotification(msg, 'error');
    console.error('Ошибка восстановления (ids:', ids, '):', err);
  } finally {
    loading.value = false;
  }
}

function close() {
  isOpen.value = false
}
</script>

<template>
  <VDialog v-model="isOpen" max-width="500px">
    <VCard>
      <VCardTitle>Бракованная наклейка</VCardTitle>
      <span class="pe-4 ps-4">
        ЧЗ испорчен. Укажите ID на наклейке, чтобы перепечать. 
      </span>

      <VCardText>
        <VCombobox
          v-model="labelIds"
          multiple
          chips
          clearable
          label="ID наклеек"
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
        <VBtn text @click="close">Отмена</VBtn>
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
