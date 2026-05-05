<script setup lang="ts">

const favicon =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📑</text></svg>"
useHead({
  title: 'PDFer',
  htmlAttrs: {
    "data-theme": "light",
  },
  bodyAttrs: {
    class: "layout-main",
  },
  link: [{ rel: "icon", type: "image/png", href: favicon }],
})

const { toasts, closeToast } = useToast()

</script>

<template>

  <div class="app-shell">
    <slot />

    <Footer />

    <TransitionGroup name="slide" tag="div" class="toast-container">
      <UiToast v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type"
        :duration="toast.duration" @close="closeToast(toast.id)" />
    </TransitionGroup>
  </div>

</template>

<style>
.toast-container {
  top: 0;
  right: 10px;
  position: fixed;
  z-index: 2000;
}
</style>
