import { computed, type Ref } from 'vue'

export type Rule = (v: any) => true | string

/**
 * Возвращает реактивное состояние для поля:
 * { error, 'error-messages', messages } — удобно прокидывать через v-bind
 */
export function useFieldState(
  rules: Ref<Rule[]> | Rule[],
  valueRef: Ref<any>,
  submitted: Ref<boolean>,
) {
  const state = computed(() => {
    const rulesArr = Array.isArray(rules) ? rules : rules.value
    const v = valueRef.value
    const errs = rulesArr.map(r => r(v)).filter(r => r !== true) as string[]
    const isSubmitted = submitted.value
    return {
      error: isSubmitted && errs.length > 0,
      'error-messages': isSubmitted ? errs : [],
      messages: !isSubmitted && errs.length ? errs : [],
    }
  })
  return state
}
