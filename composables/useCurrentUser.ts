import { computed, onMounted, ref } from "vue"

export const useCurrentUser = () => {
  const userName = ref('Гость')
  const roleVisibleName = ref('Без роли')

  onMounted(() => {
    const name = localStorage.getItem('user_name')
    const role = localStorage.getItem('role_visible_name')
    if (name) userName.value = name
    if (role) roleVisibleName.value = role
  })

  const isAdmin = computed(() => roleVisibleName.value === 'Супер администратор')

  return { userName, roleVisibleName, isAdmin }
}
