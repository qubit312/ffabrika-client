import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app"

export default defineNuxtRouteMiddleware(() => {
  const enabled = false
  if (!enabled) return navigateTo('/')
})
