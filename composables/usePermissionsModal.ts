import { useCookie, useRouter } from "nuxt/app"
import { reactive, readonly, ref } from "vue"
import { useCurrentClient } from "./useCurrentClient"


const isVisible = ref(false)
const error = reactive({ 
  message: '', 
  title: '', 
  code: 0,
})

export const usePermissionsModal = () => {
  const show = (errorData?: Partial<typeof error>) => {
    if (errorData) {
      setError(errorData)
    }
    isVisible.value = true
  }

  const hide = () => {
    const router = useRouter()
    isVisible.value = false

    if (error?.code === 401) {
        const { setClient, clearClient } = useCurrentClient()
        clearClient()
        setClient(null)

        localStorage.clear()

        const token = useCookie('access_token')
        token.value = null
        router.push('/login')
    }
    setTimeout(() => {
        resetError()
    }, 500)
  }

  const setError = (errorData: Partial<typeof error>) => {
    Object.assign(error, {
      message: errorData.message ?? '',
      title: errorData.title ?? '',
      code: errorData.code ?? 0,
    })
  }

  const setMessage = (message: string) => {
    error.message = message
  }

  const setTitle = (title: string) => {
    error.title = title
  }

  const setCode = (code: number) => {
    error.code = code
  }

  const resetError = () => {
    Object.assign(error, {
      message: '',
      title: '',
      code: 0,
    })
  }

  const getError = () => ({ ...error })

  return {
    isVisible: readonly(isVisible),
    error: readonly(error),
    show,
    hide,
    setError,
    setMessage,
    setTitle,
    setCode,
    resetError,
    getError
  }
}
