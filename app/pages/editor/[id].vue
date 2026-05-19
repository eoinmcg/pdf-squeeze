<script setup lang="ts">

const route = useRoute()
const ID = route.params.id as string

const { toast } = useToast()
const { t } = useI18n()

const { loadFile, updateMeta, getMeta, deletePage } = useFileStorage()
const fileMetaData = ref({
  id: null,
  name: '',
  size: 0,
  contentHash: '',
  pageCount: 0,
  lastOpenedAt: null,
  createdAt: null,
});
const pdfDoc = shallowRef(null)
const loading = ref(true)
const error = ref(false)

// prevent pdf getting stale
const pdfReloadKey = ref(0)


onMounted(async () => {
  await loadPdf();
})

const loadPdf = async (opts = {}) => {
  let meta = {}

  try {
    const file = await loadFile(ID)
    const arrayBuffer = await file.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    // 1. Clear the visual appearance streams so the background canvas stays clean

    meta.lastOpenedAt = Date.now();
    meta.pageCount = doc.numPages;

    pdfDoc.value = markRaw(doc)
    fileMetaData.value = await getMeta(ID);
    pdfReloadKey.value++;
  } catch (e) {
    error.value = true
    console.error('PDF Load Error:', e)
  } finally {
    loading.value = false
  }

  if (Object.keys(meta).length) {
    await updateMeta(ID, meta)
  }
}

const handlePageDelete = async (payload) => {
  try {
    await deletePage(ID, payload.page - 1)
    await loadPdf();
    toast('Page deleted', 'info')
  } catch (e) {
    console.log('Error: ', e)
  }
}

const saveMetadata = async () => {
  await updateMeta(ID, { name: fileMetaData.value.name })
  toast(t('file_renamed'))
}



</script>


<template>
  <main class="container">

    <Loading v-if="loading" />
    <div v-else-if="pdfDoc">
      <EditableTitle v-model="fileMetaData.name" @update:modelValue="saveMetadata" />

      <PdfViewer v-if="pdfDoc" :key="pdfReloadKey" :id="ID" :pdf-doc="pdfDoc" @delete-page="handlePageDelete" />

    </div>
    <div v-else-if="error" class="error card">
      {{ $t('cannot_load_file') }}
    </div>

  </main>
</template>
