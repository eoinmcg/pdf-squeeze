<script setup lang="ts">
const emit = defineEmits<{
  files: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function onDragOver() { isDragOver.value = true }
function onDragLeave() { isDragOver.value = false }
function openFileDialog() { fileInput.value?.click() }

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = Array.from(e.dataTransfer!.files)
  if (!files.length) return
  emit('files', files)
}

function onFileSelected(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  emit('files', files)
}
</script>

<template>
  <div>
    <div class="dropbox" :class="{ 'is-dragover': isDragOver }" @dragover.prevent="onDragOver" @dragleave="onDragLeave"
      @drop.prevent="onDrop" @click="openFileDialog">
      <p>Drag PDF here or click to upload</p>
    </div>
    <input ref="fileInput" type="file" class="hidden-input" accept="application/pdf" multiple
      @change="onFileSelected" />
  </div>
</template>


<style scoped>
.dropbox {
  position: relative;
  margin: 2rem 0;
  border: 3px dashed rgba(0, 0, 0, 0.2);
  padding: 2rem 1rem;
  text-align: center;
  transition: all 0.2s;
  background: linear-gradient(rgba(255, 255, 255, .8), rgba(255, 255, 255, .9));
  box-shadow: 5px 5px 5px rgba(0, 0, 0, 0.2);
}

.dropbox::before {
  content: "";
  position: absolute;
  top: 10px;
  left: 10px;
  width: 70%;
  height: 70%;
  background-image: url('/pdf.svg');
  background-repeat: no-repeat;
  background-position: top left;
  background-size: contain;
  opacity: 0.2;
  pointer-events: none;
}

@media (max-width: 600px) {
  .dropbox::before {
    background-image: none;
  }
}

.dropbox:hover {
  cursor: pointer;
  background: #eef;
  border-color: darkgreen;
}

.dropbox p {
  display: block;
  margin: 0 auto;
  width: 50%;
  text-align: center;
}

.dropbox.is-dragover {
  background: #eef;
  border-color: #55f;
}

.hidden-input {
  display: none;
}
</style>
