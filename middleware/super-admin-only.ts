import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app"

export default defineNuxtRouteMiddleware(() => {
  if (process.client) {
    const role = localStorage.getItem('role_visible_name')
    if (role !== 'Суперадминистратор') return navigateTo('/account/personal')
  }
})
