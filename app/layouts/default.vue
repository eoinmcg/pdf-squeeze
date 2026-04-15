<script setup lang="ts">

const favicon =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍋</text></svg>"
useHead({
  title: 'PDFsqueeze',
  htmlAttrs: {
    "data-theme": "light",
  },
  bodyAttrs: {
    class: "layout-main",
  },
  link: [{ rel: "icon", type: "image/png", href: favicon }],
})

</script>

<template>

  <slot />

  <Footer />

</template>
