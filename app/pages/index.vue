<script setup lang="ts">

const { saveFile, getAllMeta, deleteFile } = useFileStorage()
const { toast } = useToast()

const docs = ref([]);
const files = ref([]);

async function handleFiles(files: File[]) {
  await Promise.all(files.map(file => handleFile(file)))
}

async function handleFile(file: File) {
  if (!file) return
  if (file.type !== 'application/pdf') {
    console.warn('Only PDF files are allowed')
    return
  }

  try {
    const meta = await saveFile(file)
    if (meta.exists) {
      return toast('File exists')
    }
    docs.value = await getAllMeta()
    toast('FILE ADDED', 'info')
  } catch (err) {
    console.error('Failed to save file', err)
    toast('FAILED TO SAVE FILE', 'error')
  }
}

const handleDelete = async (file: DocumentMeta) => {
  if (!window.confirm(`Delete ${file.name}? Are you sure?`)) return;

  await deleteFile(file.id);

  docs.value = await getAllMeta();
  toast('FILE DELETED', 'info')
}

onMounted(async () => {
  docs.value = await getAllMeta()
})

</script>

<template>
  <main class="container">
    <Header />


    <DropBox @files="handleFiles" />

    <div class="docs-list card" v-if="docs.length">
      <h3>Your Files</h3>
      <div v-for="doc in docs" class="doc">
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
    </div>

  </main>
</template>

<style scoped>
.doc p.info {
  opacity: .4;
  font-size: 90%;
  text-align: right;
  transition: all .3s ease-in-out;
}

.doc:hover p.info {
  opacity: .8;
}
</style>
