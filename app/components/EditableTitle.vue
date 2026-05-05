<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

const editing = ref(false)
const draft = ref('')
const inputEl = ref(null)

function startEditing() {
  draft.value = props.modelValue
  editing.value = true

  nextTick(() => {
    const el = inputEl.value
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  })
}

function save() {
  const newValue = draft.value.trim()
  editing.value = false
  if (!newValue || newValue === props.modelValue) return
  emit('update:modelValue', newValue)
}

function cancel() {
  editing.value = false
  draft.value = props.modelValue
}
</script>

<template>
  <div class="editable-title">
    <Transition name="fade-slide" mode="out-in">
      <!-- VIEW MODE -->
      <h1 v-if="!editing" key="view" class="editable-heading" @click="startEditing">
        <Icon name="fa7-solid:pencil" class="icon" />
        {{ modelValue }}
      </h1>

      <!-- EDIT MODE -->
      <div v-else key="edit">
        <input ref="inputEl" v-model="draft" @keyup.enter="save" placeholder="Document title" />

        <div class="actions">
          <button class="cancel" @click="cancel">Cancel</button>
          <button @click="save" class="submit">Save</button>
        </div>
      </div>
    </Transition>
  </div>
</template>


<style scoped>
/* Make the h1 span full width */
.editable-heading {
  position: relative;
  width: 100%;
  cursor: pointer;
  display: block;
  font-size: 1.5rem;
  font-weight: normal;
}

.editable-heading .icon {
  opacity: .5;
}

.editable-heading:hover .icon {
  opacity: 1;
}


/* Always show icon on mobile */
@media (max-width: 600px) {
  .editable-heading .icon {
    opacity: 1 !important;
  }
}

input {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.5);
}

/* Buttons row */
.actions {
  margin: 0.5rem 0 1rem 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Transition animation */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
