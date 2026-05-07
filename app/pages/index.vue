<script setup lang="ts">

const { isDebug } = useDebug()
const { saveFile, getAllMeta, deleteFile } = useFileStorage()
const { toast } = useToast()

const docs = ref([]);

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

    const append = isDebug.value ? ': ' + err : '';
    toast('FAILED TO SAVE FILE' + append, 'error')
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

    <DropBox @files="handleFiles" />
    <DocList :docs="docs" @deleteDoc="handleDelete" />

  </main>
</template>
