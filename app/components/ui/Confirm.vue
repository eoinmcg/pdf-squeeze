<script setup lang="ts">
import { useConfirmDialog } from '@vueuse/core'

const props = defineProps<{
  title?: string
  message?: string
}>()

// These are the hooks we expose to the parent
const { isRevealed, reveal, confirm, cancel } = useConfirmDialog()

// Expose the reveal function so the parent can trigger it via template ref
defineExpose({ reveal })
</script>

<template>
  <Teleport to="body">
    <dialog :open="isRevealed" class="modal-blur">
      <article>
        <header>
          <strong>{{ title || 'Confirm Action' }}</strong>
        </header>
        <p>{{ message || 'Are you sure you want to proceed?' }}</p>
        <footer>
          <button class="secondary" @click="cancel">{{ $t('cancel') }}</button>
          <button class="contrast" @click="confirm">{{ $t('confirm') }}</button>
        </footer>
      </article>
    </dialog>
  </Teleport>
</template>

<style scoped>
/* Adds a nice backdrop blur for mobile-first feel */
.modal-blur {
  backdrop-filter: blur(4px);
  background-color: rgba(0, 0, 0, 0.5);
}

footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

footer button {
  margin-bottom: 0;
  /* Override Pico default margin */
}
</style>
