import { inject } from 'vue'

export const useInjectClient = () => {
  const client = inject('currentClient')
  
  if (!client) {
    throw new Error('Client not provided. Make sure client plugin is installed.')
  }
  
  return client
}
