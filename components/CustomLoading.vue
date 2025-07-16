<script setup lang="ts">

interface Props {
  loading: boolean
}
const props = defineProps<Props>()
</script>

<template>
  <div class="dark-overlay" :class="{ visible: props.loading }">
    <VProgressCircular
      :size="80"
      color="primary"
      indeterminate
    />
  </div>
</template>

<style lang="scss" scoped>
  .dark-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;

    display: flex;
    justify-content: center;
    align-items: center;

    background-color: rgba(255, 255, 255, 0.480);
    z-index: 9999;

    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s ease;
  }

  .dark-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
</style>
