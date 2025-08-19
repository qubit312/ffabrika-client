import { defineNuxtRouteMiddleware, navigateTo, useCookie } from "nuxt/app"

export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('access_token')
  if (!token.value && !to.meta.public) {
    return navigateTo('/login')
  }
})
