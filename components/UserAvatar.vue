<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  name: string;
  lastName?: string;
  size?: string | number;
  rounded?: boolean | string | number;
  fallback?: string;
  fontSizeClass?: string;
  fontSize?: number | string;
  colorSaturation?: number;
  colorLightness?: number;
  storageKeyPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lastName: '',
  size: 36,
  rounded: false,
  fallback: '?',
  fontSize: undefined,
  colorSaturation: 72,   
  colorLightness: 44,    
  storageKeyPrefix: 'avatar_color',
});

const initials = computed(() => {
  let init = '';
  const fullName = `${props.name} ${props.lastName}`.trim();
  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length > 0) init += parts[0].charAt(0).toUpperCase();
    if (parts.length > 1) init += parts[parts.length - 1].charAt(0).toUpperCase();
  }
  return init || props.fallback;
});

const resolvedColor = ref<string>('#999');

function computeColor(name: string, lastName: string) {
  const s = (name || '') + (lastName || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} ${props.colorSaturation}% ${props.colorLightness}%)`;
}

function storageKey(name: string, lastName: string) {
  const n = (name || '').toLowerCase().trim();
  const l = (lastName || '').toLowerCase().trim();
  return `${props.storageKeyPrefix}:${n}:${l}`;
}

watch(
  () => [props.name, props.lastName] as const,
  ([n, l]) => {
    const key = storageKey(n, l);
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (saved) {
      resolvedColor.value = saved;
    } else {
      const c = computeColor(n, l);
      resolvedColor.value = c;
      try { localStorage.setItem(key, c); } catch {}
    }
  },
  { immediate: true }
);

const textColor = computed(() => '#fff');

const fontSizeStyle = computed(() => {
  if (props.fontSize === undefined || props.fontSize === null || props.fontSize === '') return {};
  const v = typeof props.fontSize === 'number' ? `${props.fontSize}px` : String(props.fontSize);
  return { fontSize: v, lineHeight: 1, fontWeight: 600 };
});
</script>

<template>
  <VAvatar
    :size="size"
    :rounded="rounded"
    class="user-avatar"
    :style="{ backgroundColor: resolvedColor, color: textColor }"
  >
    <span :class="fontSizeClass" :style="fontSizeStyle">{{ initials }}</span>
  </VAvatar>
</template>

<style scoped>
.v-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
