<script setup lang="ts">
import type { Crumb } from '@/composables/useBreadcrumbs';
import { defineProps } from 'vue';

const props = defineProps<{ items: Crumb[] }>()
</script>

<template>
  <VBreadcrumbs :items="props.items" class="pa-0">
    <template #divider> / </template>
    <template #item="{ item }">
      <span
        v-if="item.disabled"
        class="text-medium-emphasis"
      >{{ item.text }}</span>
      <RouterLink
        v-else
        :to="item.to"
        class="text-primary text-decoration-none"
      >{{ item.text }}</RouterLink>
    </template>
  </VBreadcrumbs>
</template>
