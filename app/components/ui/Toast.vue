<script setup lang="ts">
const props = defineProps<{
  message: string | null
  duration?: number
  type?: 'success' | 'error' | 'info'
}>()

const emit = defineEmits<{
  close: []
}>()

watch(
  () => props.message,
  (newMessage) => {
    if (newMessage) {
      setTimeout(() => {
        emit('close')
      }, props.duration || 3000)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="message"
    :class="['toast', type]"
  >
    {{ message }}
  </div>
</template>

<style scoped>
.toast {
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 5px 0;
  pointer-events: auto;
}

.toast.fade-out {
  opacity: 0;
  transform: translateY(10px);
}

.toast.success {
  background: greenyellow;
  color: #222;
}

.toast.info {
  background: lightblue;
  color: #222;
}

.toast.error {
  background: crimson;
  color: #fff;
}
</style>
