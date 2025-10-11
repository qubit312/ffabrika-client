import { computed, onMounted, ref } from "vue"

export const useCurrentUser = () => {
  const userName = ref('Гость')
  const roleVisibleName = ref('Без роли')
  const userId = ref<number | null>(null)
  const isSystemUser = ref(false);
  
  onMounted(() => {
    const name = localStorage.getItem('user_name')
    const role = localStorage.getItem('role_visible_name')
    const id = Number(localStorage.getItem('user_id'))
    const isSystem = localStorage.getItem('is_system');

    if (id) userId.value = id
    if (name) userName.value = name
    if (role) roleVisibleName.value = role
    if (isSystem === '1') {
      isSystemUser.value = true
    }
  })

  const isAdmin = computed(() => isSystemUser.value)

  return { userId, userName, roleVisibleName, isAdmin }
}
