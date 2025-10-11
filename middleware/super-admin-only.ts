import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app"

export default defineNuxtRouteMiddleware(() => {
  if (process.client) {
    const isSystem = localStorage.getItem('is_system')
    if (isSystem !== '1') return navigateTo('/account/personal')
  }
})
