<script lang="ts" setup>
import navItems from '@/navigation/vertical'
import { themeConfig } from '@themeConfig'
import { ref } from 'vue'

// Components
import SupportModal from '@/components/SupportModal.vue'
import ClientSelector from '@/layouts/components/ClientSelector.vue'
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import Notifications from '@/layouts/components/Notifications.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'

// @layouts plugin
import { VerticalNavLayout } from '@layouts'

const isSupportOpen = ref(false)
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>

        <NavbarThemeSwitcher />

        <VSpacer />
        <VBtn
          color="support"
          class="me-2"
          variant="elevated"
          @click="isSupportOpen = true"
        >
          <VIcon start icon="tabler-headset" />
          Поддержка
        </VBtn>

        <SupportModal v-model="isSupportOpen" />

        <ClientSelector class="me-6" />
        <NavBarI18n
          v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
          :languages="themeConfig.app.i18n.langConfig"
        />
        <Notifications />
        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>
</template>
