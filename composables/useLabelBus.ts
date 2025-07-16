import { ref } from 'vue'

const labelUpdateListeners = ref<(() => void)[]>([])

export function useLabelEvents() {
  function onLabelsUpdated() {
    console.log('[LabelEvents] triggering update', labelUpdateListeners.value.length)
    labelUpdateListeners.value.forEach(cb => cb())
  }

  function registerLabelUpdateListener(cb: () => void) {
    if (!labelUpdateListeners.value.includes(cb)) {
      labelUpdateListeners.value.push(cb)
    }
  }

  function unregisterLabelUpdateListener(cb: () => void) {
    labelUpdateListeners.value = labelUpdateListeners.value.filter(fn => fn !== cb)
  }

  return {
    onLabelsUpdated,
    registerLabelUpdateListener,
    unregisterLabelUpdateListener,
  }
}
