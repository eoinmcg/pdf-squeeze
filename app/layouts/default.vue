<script setup lang="ts">

const favicon =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📑</text></svg>"
useHead({
  title: 'offgridPDF',
  htmlAttrs: {
    "data-theme": "light",
  },
  bodyAttrs: {
    class: "layout-main",
  },
  link: [{ rel: "icon", type: "image/svg", href: "/logo.svg" }],
})

const { toasts, closeToast } = useToast()
const { isVisible, options, confirm, cancel, dialogRef } = useConfirm()



</script>

<template>
  <div class="app-shell">

    <Header />
    <slot />

    <Footer />

    <TransitionGroup name="slide" tag="div" class="toast-container">
      <UiToast v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type"
        :duration="toast.duration" @close="closeToast(toast.id)" />
    </TransitionGroup>

    <Teleport to="body">
      <dialog ref="dialogRef" class="confirm-modal">
        <article>
          <header><strong>{{ options.title }}</strong></header>
          <p>{{ options.message }}</p>
          <footer>
            <button class="secondary" @click="cancel">{{ options.cancelText }}</button>
            <button class="confirm" @click="confirm">{{ options.confirmText }}</button>
          </footer>
        </article>
      </dialog>
    </Teleport>

  </div>
</template>

<style>
.toast-container {
  top: 0;
  right: 10px;
  position: fixed;
  z-index: 2000;
}

dialog.confirm-modal {
  border: none;
  background: transparent;
  /* The article provides the background */
  padding: 0;
}

dialog.confirm-modal::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

/* Ensure Pico CSS styles apply inside the Top Layer */
dialog.confirm-modal article {
  width: 90vw;
  max-width: 400px;
  margin: 0;
  background: var(--card-background-color, white);
}

dialog.confirm-modal button.confirm {
  background-color: crimson;
  color: #fff;
}

/* Slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  /* large enough to fit content */
  opacity: 1;
}
</style>
