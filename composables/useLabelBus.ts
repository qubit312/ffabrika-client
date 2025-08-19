import { ref } from 'vue'

const labelUpdateListeners = ref<(() => void)[]>([])

export function useLabelEvents() {
  function onLabelsUpdated() {
    labelUpdateListeners.value.forEach(cb => cb())
  }

  function onPrinterUpdated() {
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
    onPrinterUpdated,
    registerLabelUpdateListener,
    unregisterLabelUpdateListener,
  }
}
