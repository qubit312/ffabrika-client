import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'

export interface Crumb {
  text: string
  to?: any 
  disabled?: boolean
}

export function useBreadcrumbs(
  sectionLabel: string,         
  sectionRoute: any,            
  currentLabel: Ref<string>,   
  isCreate: Ref<boolean>,       
) {
  const router = useRouter()

  const items = computed<Crumb[]>(() => {
    const last = isCreate.value ? 'Создание' : (currentLabel.value || '—')
    return [
      { text: sectionLabel, to: sectionRoute },
      { text: last, disabled: true },
    ]
  })

  const fullTitle = computed(() => items.value.map(i => i.text).join(' / '))

  function go(to: any) {
    if (!to) return
    router.push(to)
  }

  return { items, fullTitle, go }
}
