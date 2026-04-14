<script setup>
import { onMounted } from "vue";
import { gsap } from 'gsap';

onMounted(() => {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

  tl.to("#jawLeft", { x: 30, duration: 0.8, ease: "power2.inOut" }, 0)
    .to("#jawRight", { x: -30, duration: 0.8, ease: "power2.inOut" }, 0)

    .to("#pdf", {
      scaleX: 0.4,
      transformOrigin: "50% 50%",
      duration: 0.8,
      ease: "power2.inOut"
    }, 0)

    .to("#pdf", {
      scaleX: 0.5,
      duration: 0.2,
      ease: "elastic.out(1, 0.4)"
    })

    .to("#jawLeft", { x: 0, duration: 0.6, ease: "power2.inOut" })
    .to("#jawRight", { x: 0, duration: 0.6, ease: "power2.inOut" }, "<")
    .to("#pdf", {
      scaleX: 1,
      duration: 0.6,
      ease: "power2.inOut"
    }, "<");
});
</script>

<template>
  <div class="pdf-vice">
    <svg id="pdfAnim" viewBox="0 0 300 200" width="100%">
      <!-- PDF sheet -->
      <rect id="pdf" x="100" y="40" width="100" height="120" rx="6" fill="#fff" stroke="#d33" stroke-width="3" />
      <text x="150" y="110" text-anchor="middle" font-size="32" fill="#d33" font-family="Arial">PDF</text>

      <!-- Left jaw -->
      <rect id="jawLeft" x="40" y="30" width="40" height="140" rx="4" fill="#666" />

      <!-- Right jaw -->
      <rect id="jawRight" x="220" y="30" width="40" height="140" rx="4" fill="#666" />
    </svg>
  </div>
</template>

<style scoped>
.pdf-vice {
  width: 300px;
  margin: 40px auto;
}
</style>
