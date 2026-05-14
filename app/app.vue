<script setup lang="ts">
import 'assets/css/style.css'
import './lib/pdfjs'


onMounted(async () => {
  await requestPersistence()
})

</script>

<template>
  <NuxtLayout>
    <div class="page-wrapper">
      <NuxtPage :page-key="route => route.fullPath" />
    </div>

    <GrainCanvas style="position: fixed; inset: 0; z-index: -1;" />
  </NuxtLayout>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
  position: relative;
}

.page-enter-from {
  transform: translateY(30px);
  opacity: 0;
}

.page-leave-to {
  transform: translateY(-30px);
  opacity: 0;
}
</style>
