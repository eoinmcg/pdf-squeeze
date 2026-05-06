<script setup lang="ts">

const { deleteFile } = useFileStorage()
const { toast } = useToast()

const props = defineProps({
  docs: Array
})

const emit = defineEmits(['deleteDoc'])

function handleDelete(doc: Partial<DocMeta>) {
  emit('deleteDoc', doc)
}

</script>

<template>
  <div class="docs-list card" v-if="docs.length">
    <h3>Your Files</h3>
    <TransitionGroup name="list" tag="div" class="doc-container">
      <div v-for="doc in docs" class="doc" :key="doc.id">
        <UiDeleteButton @click="handleDelete(doc)" />
        <NuxtLink :to="`/editor/${doc.id}`">
          <Icon name="fa7-solid:pencil" />
          {{ doc.name }}
        </NuxtLink>
        <p class="info">
          Added: {{ formatDate(doc.createdAt) }}
          {{ formatBytes(doc.size) }}
        </p>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.doc-container {
  position: relative;
  overflow: hidden;
}

.doc p.info {
  opacity: .4;
  font-size: 90%;
  text-align: right;
  transition: all .3s ease-in-out;
}

.doc:hover p.info {
  opacity: .8;
}

.doc {
  background-color: transparent;
  /* or your default color */
  overflow: hidden;
  /* Crucial for the collapse effect */
  margin-bottom: 8px;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

/* 2. The leaving transition (the specific animation for the deleted doc) */
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 3. Ensure the leaving element is taken out of layout flow 
      so the others can slide up immediately */
.list-leave-active {
  position: absolute;
  width: 100%;
  /* Match the width of your container */
}
</style>
